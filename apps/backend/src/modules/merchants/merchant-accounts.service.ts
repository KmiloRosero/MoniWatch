import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MerchantStatus, WompiEnvironment } from '@prisma/client';
import { EnvironmentVariables } from '../../config/env.validation';
import { TokenVaultService } from '../../infrastructure/crypto/token-vault.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MerchantGatewayAccount } from '../../payment-providers/payment-provider.interface';

/** Plaintext Wompi keys of one merchant, as typed by its owner. */
export interface WompiKeys {
  publicKey: string;
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
}

/** Secrets stored encrypted on the merchant row (the public key stays in clear to find the merchant). */
interface StoredWompiSecrets {
  privateKey: string;
  integritySecret: string;
  eventsSecret: string;
}

/** Every Wompi key carries its environment in the prefix; all four must agree. */
const KEY_PREFIXES: Record<WompiEnvironment, Record<keyof WompiKeys, string>> = {
  [WompiEnvironment.SANDBOX]: {
    publicKey: 'pub_test_',
    privateKey: 'prv_test_',
    integritySecret: 'test_integrity_',
    eventsSecret: 'test_events_',
  },
  [WompiEnvironment.PRODUCTION]: {
    publicKey: 'pub_prod_',
    privateKey: 'prv_prod_',
    integritySecret: 'prod_integrity_',
    eventsSecret: 'prod_events_',
  },
};

/** Encrypted columns written for a merchant's Wompi account. */
export interface EncryptedWompiAccount {
  wompiEnvironment: WompiEnvironment;
  wompiPublicKey: string;
  wompiSecrets: string;
  wompiSecretsIv: string;
  wompiSecretsAuthTag: string;
  wompiSecretsKeyId: string;
}

/**
 * Owns merchants' Wompi credentials: validates them, encrypts them at rest (AES-256-GCM)
 * and decrypts them in memory only when a charge, reconciliation or webhook needs them.
 */
@Injectable()
export class MerchantAccountsService {
  private readonly logger = new Logger(MerchantAccountsService.name);
  private readonly apiUrls: Record<WompiEnvironment, string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: TokenVaultService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.apiUrls = {
      [WompiEnvironment.SANDBOX]: config.get('WOMPI_SANDBOX_API_URL', { infer: true }),
      [WompiEnvironment.PRODUCTION]: config.get('WOMPI_PRODUCTION_API_URL', { infer: true }),
    };
  }

  /** Rejects keys that mix environments or are pasted into the wrong field. */
  resolveEnvironment(keys: WompiKeys): WompiEnvironment {
    const environment = (Object.keys(KEY_PREFIXES) as WompiEnvironment[]).find((candidate) =>
      keys.publicKey.startsWith(KEY_PREFIXES[candidate].publicKey),
    );
    if (!environment) {
      throw new BadRequestException('wompiPublicKey must start with pub_test_ or pub_prod_');
    }

    const prefixes = KEY_PREFIXES[environment];
    for (const field of Object.keys(prefixes) as (keyof WompiKeys)[]) {
      if (!keys[field].startsWith(prefixes[field])) {
        throw new BadRequestException(`${field} must start with ${prefixes[field]} to match the public key`);
      }
    }
    return environment;
  }

  apiUrlFor(environment: WompiEnvironment): string {
    return this.apiUrls[environment];
  }

  encrypt(keys: WompiKeys): EncryptedWompiAccount {
    const environment = this.resolveEnvironment(keys);
    const secrets: StoredWompiSecrets = {
      privateKey: keys.privateKey,
      integritySecret: keys.integritySecret,
      eventsSecret: keys.eventsSecret,
    };
    const encrypted = this.vault.encrypt(JSON.stringify(secrets));
    return {
      wompiEnvironment: environment,
      wompiPublicKey: keys.publicKey,
      wompiSecrets: encrypted.ciphertext,
      wompiSecretsIv: encrypted.iv,
      wompiSecretsAuthTag: encrypted.authTag,
      wompiSecretsKeyId: encrypted.keyId,
    };
  }

  /** Decrypted account of an active merchant, or null when it has no usable Wompi account. */
  async load(merchantId: string): Promise<MerchantGatewayAccount | null> {
    const merchant = await this.prisma.merchant.findFirst({
      where: { id: merchantId, status: MerchantStatus.ACTIVE },
      select: {
        id: true,
        wompiEnvironment: true,
        wompiPublicKey: true,
        wompiSecrets: true,
        wompiSecretsIv: true,
        wompiSecretsAuthTag: true,
        wompiSecretsKeyId: true,
      },
    });
    if (
      !merchant?.wompiEnvironment ||
      !merchant.wompiPublicKey ||
      !merchant.wompiSecrets ||
      !merchant.wompiSecretsIv ||
      !merchant.wompiSecretsAuthTag ||
      !merchant.wompiSecretsKeyId
    ) {
      return null;
    }

    try {
      const secrets = JSON.parse(
        this.vault.decrypt({
          ciphertext: merchant.wompiSecrets,
          iv: merchant.wompiSecretsIv,
          authTag: merchant.wompiSecretsAuthTag,
          keyId: merchant.wompiSecretsKeyId,
        }),
      ) as StoredWompiSecrets;
      return {
        merchantId: merchant.id,
        apiUrl: this.apiUrlFor(merchant.wompiEnvironment),
        publicKey: merchant.wompiPublicKey,
        ...secrets,
      };
    } catch (error) {
      this.logger.error(`Could not decrypt Wompi keys of merchant ${merchant.id}`, error instanceof Error ? error.stack : undefined);
      return null;
    }
  }
}
