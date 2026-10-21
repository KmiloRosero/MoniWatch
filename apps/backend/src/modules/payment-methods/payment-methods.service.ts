import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider, Prisma } from '@prisma/client';
import { lastDigits, maskPhoneNumber } from '../../common/utils/mask';
import { TokenVaultService } from '../../infrastructure/crypto/token-vault.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentProviderFactory } from '../../payment-providers/payment-provider.factory';
import { ProviderCredentials } from '../../payment-providers/payment-provider.interface';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { paymentMethodPublicSelect } from './payment-method.select';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: TokenVaultService,
    private readonly providers: PaymentProviderFactory,
  ) {}

  async create(userId: string, dto: CreatePaymentMethodDto) {
    const adapter = this.providers.get(dto.provider);
    if (!adapter.supportedMethodTypes.includes(dto.type)) {
      throw new BadRequestException(`${dto.provider} does not support ${dto.type} payment methods`);
    }

    const isCard = dto.type === PaymentMethodType.CARD;
    if (isCard) {
      this.assertCardNotExpired(dto.cardExpMonth!, dto.cardExpYear!);
    }

    const tokenFingerprint = this.vault.fingerprint(dto.providerToken);
    const existing = await this.prisma.paymentMethod.findUnique({
      where: {
        userId_provider_tokenFingerprint: { userId, provider: dto.provider, tokenFingerprint },
      },
      select: { id: true, status: true },
    });

    if (existing && existing.status !== PaymentMethodStatus.REVOKED) {
      throw new ConflictException('This payment method is already registered');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, phoneNumber: true, firstName: true, lastName: true },
    });

    const walletPhoneNumber =
      dto.type === PaymentMethodType.WALLET ? (dto.walletPhoneNumber ?? user.phoneNumber) : null;
    const credentials: ProviderCredentials = { providerToken: dto.providerToken, walletPhoneNumber };

    const source = await adapter.createPaymentSource({
      type: dto.type,
      credentials,
      acceptance:
        dto.acceptanceToken && dto.personalDataAuthToken
          ? { acceptanceToken: dto.acceptanceToken, personalDataAuthToken: dto.personalDataAuthToken }
          : null,
      customer: {
        email: user.email,
        phoneNumber: user.phoneNumber,
        fullName: `${user.firstName} ${user.lastName}`,
      },
    });

    const encrypted = this.vault.encrypt(JSON.stringify(credentials));
    const activeDefaultCount = await this.prisma.paymentMethod.count({
      where: { userId, isDefault: true, status: PaymentMethodStatus.ACTIVE },
    });
    // The first active method becomes the default automatically.
    const isDefault =
      source.status === PaymentMethodStatus.ACTIVE && (dto.isDefault === true || activeDefaultCount === 0);

    const data = {
      provider: dto.provider,
      type: dto.type,
      status: source.status,
      alias: dto.alias ?? null,
      isDefault,
      displayLabel: this.buildDisplayLabel(dto, walletPhoneNumber),
      last4: isCard ? dto.last4! : null,
      cardBrand: isCard ? dto.cardBrand!.toUpperCase() : null,
      cardExpMonth: isCard ? dto.cardExpMonth! : null,
      cardExpYear: isCard ? dto.cardExpYear! : null,
      maskedPhoneNumber: walletPhoneNumber ? maskPhoneNumber(walletPhoneNumber) : null,
      encryptedToken: encrypted.ciphertext,
      tokenIv: encrypted.iv,
      tokenAuthTag: encrypted.authTag,
      encryptionKeyId: encrypted.keyId,
      tokenFingerprint,
      tokenExpiresAt: source.tokenExpiresAt,
      providerSourceId: source.providerSourceId,
      providerCustomerId: source.providerCustomerId,
      providerMetadata: source.metadata as Prisma.InputJsonObject,
      revokedAt: null,
    } satisfies Omit<Prisma.PaymentMethodUncheckedCreateInput, 'userId'>;

    return this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // A previously revoked method with the same token is reactivated instead of duplicated.
      return existing
        ? tx.paymentMethod.update({ where: { id: existing.id }, data, select: paymentMethodPublicSelect })
        : tx.paymentMethod.create({ data: { ...data, userId }, select: paymentMethodPublicSelect });
    });
  }

  /** What the app needs to tokenize a card with the provider and show its legal terms. */
  async getCheckoutConfig(provider: PaymentProvider) {
    const adapter = this.providers.get(provider);
    if (!adapter.getCheckoutConfig) {
      throw new NotFoundException(`${provider} has no checkout configuration`);
    }
    return adapter.getCheckoutConfig();
  }

  findAllForUser(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId, status: { not: PaymentMethodStatus.REVOKED } },
      select: paymentMethodPublicSelect,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOneForUser(userId: string, id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id, userId, status: { not: PaymentMethodStatus.REVOKED } },
      select: paymentMethodPublicSelect,
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }
    return paymentMethod;
  }

  async setDefault(userId: string, id: string) {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id, userId, status: PaymentMethodStatus.ACTIVE },
      select: { id: true },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found or not active');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      return tx.paymentMethod.update({
        where: { id },
        data: { isDefault: true },
        select: paymentMethodPublicSelect,
      });
    });
  }

  async revoke(userId: string, id: string): Promise<void> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { id, userId, status: { not: PaymentMethodStatus.REVOKED } },
      select: { id: true },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    await this.prisma.$transaction([
      this.prisma.paymentMethod.update({
        where: { id },
        data: { status: PaymentMethodStatus.REVOKED, isDefault: false, revokedAt: new Date() },
      }),
      this.prisma.deviceSession.updateMany({
        where: { userId, defaultPaymentMethodId: id },
        data: { defaultPaymentMethodId: null },
      }),
    ]);
  }

  private buildDisplayLabel(dto: CreatePaymentMethodDto, walletPhoneNumber: string | null): string {
    switch (dto.type) {
      case PaymentMethodType.CARD:
        return `${dto.cardBrand!.toUpperCase()} ****${dto.last4}`;
      case PaymentMethodType.WALLET:
        return `${dto.provider} ****${lastDigits(walletPhoneNumber!)}`;
      case PaymentMethodType.BANK_TRANSFER:
        return dto.alias ? `${dto.provider} ${dto.alias}` : `${dto.provider} ${dto.type}`;
    }
  }

  private assertCardNotExpired(expMonth: number, expYear: number): void {
    // Cards are valid through the last day of their expiration month.
    const firstDayAfterExpiry = new Date(expYear, expMonth, 1);
    if (firstDayAfterExpiry <= new Date()) {
      throw new BadRequestException('Card is expired');
    }
  }
}
