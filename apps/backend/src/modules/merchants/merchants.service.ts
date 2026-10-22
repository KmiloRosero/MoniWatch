import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MerchantStatus, PaymentProvider, Prisma } from '@prisma/client';
import { EnvironmentVariables, ProviderMode } from '../../config/env.validation';
import { HashingService } from '../../infrastructure/crypto/hashing.service';
import { PRISMA_UNIQUE_VIOLATION } from '../../infrastructure/prisma/prisma-errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentProviderFactory } from '../../payment-providers/payment-provider.factory';
import { CheckoutConfig, GatewayAccountInfo } from '../../payment-providers/payment-provider.interface';
import { RegisterMerchantDto } from './dto/merchant.dto';
import { MerchantAccountsService, WompiKeys } from './merchant-accounts.service';
import { merchantOwnerSelect, merchantPublicSelect } from './merchant.select';

/** No 0/O, 1/I or vowels: codes are read aloud and typed, and never spell words. */
const MERCHANT_CODE_ALPHABET = '23456789BCDFGHJKLMNPQRSTVWXZ';
const MAX_CODE_ATTEMPTS = 5;
const SEARCH_RESULTS_LIMIT = 20;

type NewMerchantData = Omit<Prisma.MerchantUncheckedCreateInput, 'code'>;

@Injectable()
export class MerchantsService {
  private readonly codeLength: number;
  private readonly wompiLive: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MerchantAccountsService,
    private readonly providers: PaymentProviderFactory,
    private readonly hashing: HashingService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.codeLength = config.get('MERCHANT_CODE_LENGTH', { infer: true });
    this.wompiLive = config.get('WOMPI_MODE', { infer: true }) === ProviderMode.Live;
  }

  /** A business connects its own Wompi account: payments to it settle directly there. */
  async register(ownerUserId: string, dto: RegisterMerchantDto) {
    const keys: WompiKeys = {
      publicKey: dto.wompiPublicKey,
      privateKey: dto.wompiPrivateKey,
      integritySecret: dto.wompiIntegritySecret,
      eventsSecret: dto.wompiEventsSecret,
    };
    const environment = this.accounts.resolveEnvironment(keys);

    // In SIMULATED mode nothing reaches Wompi, so keys are only checked for shape.
    const info = this.wompiLive ? await this.verifyKeys(keys, this.accounts.apiUrlFor(environment)) : null;
    if (info && !info.active) {
      throw new UnprocessableEntityException('The Wompi account is not active');
    }

    const name = dto.name ?? info?.name;
    if (!name) {
      throw new BadRequestException('name is required');
    }

    return this.createWithUniqueCode({
      name,
      category: dto.category ?? null,
      ownerUserId,
      status: MerchantStatus.ACTIVE,
      ...this.accounts.encrypt(keys),
    });
  }

  /**
   * Registers or refreshes a merchant from server configuration (no owner). The keys are
   * checked against Wompi first, since nobody would see a validation error at boot time.
   */
  async upsertPlatformMerchant(keys: WompiKeys): Promise<{ name: string; code: string; created: boolean }> {
    const environment = this.accounts.resolveEnvironment(keys);
    const encrypted = this.accounts.encrypt(keys);

    const existing = await this.prisma.merchant.findUnique({
      where: { wompiPublicKey: keys.publicKey },
      select: { id: true },
    });
    if (existing) {
      const updated = await this.prisma.merchant.update({
        where: { id: existing.id },
        data: { ...encrypted, status: MerchantStatus.ACTIVE },
        select: { name: true, code: true },
      });
      return { ...updated, created: false };
    }

    const info = await this.verifyKeys(keys, this.accounts.apiUrlFor(environment));
    if (!info.name) {
      throw new UnprocessableEntityException('Wompi did not return a business name for this account');
    }
    const created = await this.createWithUniqueCode({
      name: info.name,
      ownerUserId: null,
      status: info.active ? MerchantStatus.ACTIVE : MerchantStatus.INACTIVE,
      ...encrypted,
    });
    return { name: created.name, code: created.code, created: true };
  }

  listOwned(ownerUserId: string) {
    return this.prisma.merchant.findMany({
      where: { ownerUserId },
      select: merchantOwnerSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async deactivate(ownerUserId: string, id: string): Promise<void> {
    const { count } = await this.prisma.merchant.updateMany({
      where: { id, ownerUserId, status: MerchantStatus.ACTIVE },
      data: { status: MerchantStatus.INACTIVE },
    });
    if (count === 0) {
      throw new NotFoundException('Merchant not found');
    }
  }

  /** Directory of active merchants, by name or by exact code. */
  search(search?: string) {
    const term = search?.trim();
    return this.prisma.merchant.findMany({
      where: {
        status: MerchantStatus.ACTIVE,
        ...(term
          ? { OR: [{ name: { contains: term, mode: 'insensitive' } }, { code: term.toUpperCase() }] }
          : {}),
      },
      select: merchantPublicSelect,
      orderBy: { name: 'asc' },
      take: SEARCH_RESULTS_LIMIT,
    });
  }

  async findPublic(id: string) {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id, status: MerchantStatus.ACTIVE },
      select: merchantPublicSelect,
    });
    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }
    return merchant;
  }

  /** Payees the user added on the phone; the watch offers exactly these. */
  async listSaved(userId: string) {
    const saved = await this.prisma.savedMerchant.findMany({
      where: { userId, merchant: { status: MerchantStatus.ACTIVE } },
      select: { merchant: { select: merchantPublicSelect } },
      orderBy: { createdAt: 'asc' },
    });
    return saved.map(({ merchant }) => merchant);
  }

  async save(userId: string, merchantId: string) {
    const merchant = await this.findPublic(merchantId);
    await this.prisma.savedMerchant.upsert({
      where: { userId_merchantId: { userId, merchantId } },
      create: { userId, merchantId },
      update: {},
    });
    return merchant;
  }

  async unsave(userId: string, merchantId: string): Promise<void> {
    await this.prisma.savedMerchant.deleteMany({ where: { userId, merchantId } });
  }

  /** What the phone needs to tokenize a card against this merchant's Wompi account. */
  async getWompiCheckout(merchantId: string): Promise<CheckoutConfig> {
    const account = await this.accounts.load(merchantId);
    if (!account) {
      throw new NotFoundException('Merchant not found or without a Wompi account');
    }
    const adapter = this.providers.get(PaymentProvider.WOMPI);
    if (!adapter.getCheckoutConfig) {
      throw new NotFoundException('Wompi has no checkout configuration');
    }
    return adapter.getCheckoutConfig(account);
  }

  private async verifyKeys(keys: WompiKeys, apiUrl: string): Promise<GatewayAccountInfo> {
    const adapter = this.providers.get(PaymentProvider.WOMPI);
    if (!adapter.verifyAccount) {
      throw new UnprocessableEntityException('Wompi accounts cannot be verified');
    }
    return adapter.verifyAccount({ apiUrl, ...keys });
  }

  private async createWithUniqueCode(data: NewMerchantData) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.merchant.create({
          data: { ...data, code: this.hashing.generateCode(this.codeLength, MERCHANT_CODE_ALPHABET) },
          select: merchantOwnerSelect,
        });
      } catch (error) {
        const target = uniqueViolationTarget(error);
        if (target?.includes('wompiPublicKey')) {
          throw new ConflictException('This Wompi account is already registered');
        }
        if (target?.includes('code') && attempt < MAX_CODE_ATTEMPTS) continue;
        throw error;
      }
    }
  }
}

/** Columns of a unique violation (Prisma reports them in meta.target). */
function uniqueViolationTarget(error: unknown): string[] | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== PRISMA_UNIQUE_VIOLATION) {
    return null;
  }
  const target = error.meta?.target;
  return Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : [];
}
