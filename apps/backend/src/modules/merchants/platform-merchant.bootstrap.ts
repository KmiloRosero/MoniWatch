import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import { MerchantsService } from './merchants.service';

/**
 * When the WOMPI_* keys are configured on the server, that Wompi account is registered as a
 * merchant (or its keys refreshed) at startup. Failing here never stops the API.
 */
@Injectable()
export class PlatformMerchantBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformMerchantBootstrap.name);

  constructor(
    private readonly merchants: MerchantsService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const publicKey = this.config.get('WOMPI_PUBLIC_KEY', { infer: true });
    const privateKey = this.config.get('WOMPI_PRIVATE_KEY', { infer: true });
    const integritySecret = this.config.get('WOMPI_INTEGRITY_SECRET', { infer: true });
    const eventsSecret = this.config.get('WOMPI_EVENTS_SECRET', { infer: true });
    if (!publicKey || !privateKey || !integritySecret || !eventsSecret) return;

    try {
      const merchant = await this.merchants.upsertPlatformMerchant({ publicKey, privateKey, integritySecret, eventsSecret });
      this.logger.log(`${merchant.created ? 'Registered' : 'Refreshed'} platform merchant "${merchant.name}" (code ${merchant.code})`);
    } catch (error) {
      this.logger.error(
        `Could not register the platform merchant from WOMPI_* keys: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
