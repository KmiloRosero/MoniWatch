import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MerchantStatus,
  PaymentMethodStatus,
  Prisma,
  TransactionChannel,
  TransactionStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { EnvironmentVariables } from '../../config/env.validation';
import { TokenVaultService } from '../../infrastructure/crypto/token-vault.service';
import { isUniqueViolation } from '../../infrastructure/prisma/prisma-errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentProviderFactory } from '../../payment-providers/payment-provider.factory';
import {
  ChargeOutcome,
  ChargeResult,
  ProviderCredentials,
  ProviderCustomer,
} from '../../payment-providers/payment-provider.interface';
import { PaymentPinService } from '../auth/services/payment-pin.service';
import { AuthPrincipal } from '../auth/types/auth-principal';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionStateService } from './transaction-state.service';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import {
  DEFAULT_PAGE_SIZE,
  DEVICE_LIMIT_WINDOW_MS,
  LIMIT_COUNTED_STATUSES,
  PublicTransaction,
  transactionPublicSelect,
  TransitionSource,
} from './transaction.constants';

const MS_PER_MINUTE = 60_000;

const chargeablePaymentMethodSelect = {
  id: true,
  provider: true,
  encryptedToken: true,
  tokenIv: true,
  tokenAuthTag: true,
  encryptionKeyId: true,
  providerSourceId: true,
  tokenExpiresAt: true,
} satisfies Prisma.PaymentMethodSelect;

type ChargeablePaymentMethod = Prisma.PaymentMethodGetPayload<{
  select: typeof chargeablePaymentMethodSelect;
}>;

const deviceLimitsSelect = {
  id: true,
  maxAmountPerTransaction: true,
  dailyLimitInCents: true,
  requirePinAboveInCents: true,
  defaultPaymentMethodId: true,
} satisfies Prisma.DeviceSessionSelect;

type DeviceLimits = Prisma.DeviceSessionGetPayload<{ select: typeof deviceLimitsSelect }>;

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly expirationMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: TokenVaultService,
    private readonly providers: PaymentProviderFactory,
    private readonly paymentPin: PaymentPinService,
    private readonly state: TransactionStateService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.expirationMs = config.get('TRANSACTION_EXPIRATION_MINUTES', { infer: true }) * MS_PER_MINUTE;
  }

  /**
   * Payment flow: PENDING -> PROCESSING -> APPROVED | FAILED.
   * Every transition is persisted together with a TransactionStatusHistory row.
   */
  async create(principal: AuthPrincipal, dto: CreateTransactionDto): Promise<PublicTransaction> {
    const { userId } = principal;

    const replay = await this.findByIdempotencyKey(userId, dto.idempotencyKey);
    if (replay) {
      return this.assertSameRequest(replay, dto);
    }

    const device = principal.deviceSessionId
      ? await this.prisma.deviceSession.findUniqueOrThrow({
          where: { id: principal.deviceSessionId },
          select: deviceLimitsSelect,
        })
      : null;

    const paymentMethod = await this.resolvePaymentMethod(
      userId,
      dto.paymentMethodId ?? device?.defaultPaymentMethodId ?? null,
    );

    if (dto.merchantId) {
      await this.assertMerchantActive(dto.merchantId);
    }

    if (device) {
      await this.enforceDeviceLimits(userId, device, dto);
    }

    let transactionId: string;
    let reference: string;
    try {
      const created = await this.prisma.transaction.create({
        data: {
          reference: randomUUID(),
          idempotencyKey: dto.idempotencyKey,
          userId,
          paymentMethodId: paymentMethod.id,
          merchantId: dto.merchantId,
          deviceSessionId: device?.id,
          provider: paymentMethod.provider,
          channel: device ? TransactionChannel.WATCH : TransactionChannel.MOBILE,
          status: TransactionStatus.PENDING,
          amountInCents: dto.amountInCents,
          currency: dto.currency,
          description: dto.description,
          expiresAt: new Date(Date.now() + this.expirationMs),
          statusHistory: {
            create: { fromStatus: null, toStatus: TransactionStatus.PENDING, source: TransitionSource.Api },
          },
        },
        select: { id: true, reference: true },
      });
      transactionId = created.id;
      reference = created.reference;
    } catch (error) {
      // Two concurrent requests with the same idempotency key: return the winner.
      if (isUniqueViolation(error)) {
        const concurrent = await this.findByIdempotencyKey(userId, dto.idempotencyKey);
        if (concurrent) {
          return this.assertSameRequest(concurrent, dto);
        }
      }
      throw error;
    }

    await this.state.transition(transactionId, TransactionStatus.PENDING, TransactionStatus.PROCESSING, TransitionSource.Api);

    const customer = await this.loadCustomer(userId);
    const result = await this.charge(paymentMethod, reference, dto, customer);
    await this.applyChargeResult(transactionId, result);
    await this.touchUsage(paymentMethod.id, device?.id ?? null);

    return this.findOneForUser(userId, transactionId);
  }

  async findAllForUser(userId: string, query: ListTransactionsQueryDto) {
    const limit = query.limit ?? DEFAULT_PAGE_SIZE;

    const items = await this.prisma.transaction.findMany({
      where: { userId, status: query.status },
      select: transactionPublicSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return { items: page, nextCursor: hasMore ? page[page.length - 1].id : null };
  }

  async findOneForUser(userId: string, id: string): Promise<PublicTransaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      select: transactionPublicSelect,
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  private findByIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.prisma.transaction.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      select: transactionPublicSelect,
    });
  }

  private assertSameRequest(existing: PublicTransaction, dto: CreateTransactionDto): PublicTransaction {
    const differs =
      existing.amountInCents !== dto.amountInCents ||
      existing.currency !== dto.currency ||
      (dto.paymentMethodId !== undefined && existing.paymentMethod.id !== dto.paymentMethodId);

    if (differs) {
      throw new ConflictException('Idempotency key was already used with different payment parameters');
    }
    return existing;
  }

  private async resolvePaymentMethod(
    userId: string,
    paymentMethodId: string | null,
  ): Promise<ChargeablePaymentMethod> {
    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: {
        userId,
        status: PaymentMethodStatus.ACTIVE,
        ...(paymentMethodId ? { id: paymentMethodId } : { isDefault: true }),
      },
      select: chargeablePaymentMethodSelect,
    });

    if (!paymentMethod) {
      throw new UnprocessableEntityException(
        paymentMethodId ? 'Payment method not found or not active' : 'No default payment method configured',
      );
    }

    if (paymentMethod.tokenExpiresAt && paymentMethod.tokenExpiresAt <= new Date()) {
      throw new UnprocessableEntityException('Payment method token has expired');
    }

    return paymentMethod;
  }

  private async assertMerchantActive(merchantId: string): Promise<void> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, status: MerchantStatus.ACTIVE },
      select: { id: true },
    });
    if (!merchant) {
      throw new UnprocessableEntityException('Merchant not found or not active');
    }
  }

  private async enforceDeviceLimits(userId: string, device: DeviceLimits, dto: CreateTransactionDto): Promise<void> {
    if (device.maxAmountPerTransaction !== null && dto.amountInCents > device.maxAmountPerTransaction) {
      throw new UnprocessableEntityException('Amount exceeds the per-transaction limit of this device');
    }

    if (device.dailyLimitInCents !== null) {
      const { _sum } = await this.prisma.transaction.aggregate({
        where: {
          deviceSessionId: device.id,
          status: { in: LIMIT_COUNTED_STATUSES },
          createdAt: { gte: new Date(Date.now() - DEVICE_LIMIT_WINDOW_MS) },
        },
        _sum: { amountInCents: true },
      });

      if ((_sum.amountInCents ?? 0) + dto.amountInCents > device.dailyLimitInCents) {
        throw new UnprocessableEntityException('Amount exceeds the daily limit of this device');
      }
    }

    if (device.requirePinAboveInCents !== null && dto.amountInCents > device.requirePinAboveInCents) {
      await this.paymentPin.verifyPin(userId, dto.paymentPin);
    }
  }

  private async loadCustomer(userId: string): Promise<ProviderCustomer> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, phoneNumber: true, firstName: true, lastName: true },
    });
    return {
      email: user.email,
      phoneNumber: user.phoneNumber,
      fullName: `${user.firstName} ${user.lastName}`,
    };
  }

  /** Never throws: any provider or decryption error becomes an ERROR outcome. */
  private async charge(
    paymentMethod: ChargeablePaymentMethod,
    reference: string,
    dto: CreateTransactionDto,
    customer: ProviderCustomer,
  ): Promise<ChargeResult> {
    try {
      const credentials = JSON.parse(
        this.vault.decrypt({
          ciphertext: paymentMethod.encryptedToken,
          iv: paymentMethod.tokenIv,
          authTag: paymentMethod.tokenAuthTag,
          keyId: paymentMethod.encryptionKeyId,
        }),
      ) as ProviderCredentials;

      return await this.providers.get(paymentMethod.provider).charge({
        reference,
        amountInCents: dto.amountInCents,
        currency: dto.currency,
        description: dto.description ?? null,
        credentials,
        providerSourceId: paymentMethod.providerSourceId,
        customer,
      });
    } catch (error) {
      this.logger.error(
        `Charge failed for transaction reference ${reference}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        outcome: ChargeOutcome.Error,
        providerTransactionId: null,
        providerStatus: 'UNREACHABLE',
        failureCode: 'PROVIDER_ERROR',
        failureReason: 'The payment provider could not process the request',
        rawResponse: {},
      };
    }
  }

  private async applyChargeResult(transactionId: string, result: ChargeResult): Promise<void> {
    const approved = result.outcome === ChargeOutcome.Approved;
    const now = new Date();

    await this.state.transition(
      transactionId,
      TransactionStatus.PROCESSING,
      approved ? TransactionStatus.APPROVED : TransactionStatus.FAILED,
      TransitionSource.Provider,
      {
        providerTransactionId: result.providerTransactionId,
        providerStatus: result.providerStatus,
        providerResponse: result.rawResponse as Prisma.InputJsonObject,
        failureCode: result.failureCode,
        failureReason: result.failureReason,
        processedAt: now,
        approvedAt: approved ? now : null,
        failedAt: approved ? null : now,
      },
      result.failureReason,
    );
  }

  private async touchUsage(paymentMethodId: string, deviceSessionId: string | null): Promise<void> {
    const now = new Date();
    await this.prisma.paymentMethod.update({ where: { id: paymentMethodId }, data: { lastUsedAt: now } });
    if (deviceSessionId) {
      await this.prisma.deviceSession.update({ where: { id: deviceSessionId }, data: { lastSeenAt: now } });
    }
  }
}
