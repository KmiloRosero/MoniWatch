import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '@prisma/client';
import { lastDigits } from '../../common/utils/mask';
import { EnvironmentVariables, ProviderMode } from '../../config/env.validation';
import { PaymentGatewaySimulator } from '../payment-gateway.simulator';
import {
  ChargeInput,
  ChargeOutcome,
  ChargeResult,
  CreatePaymentSourceInput,
  PaymentProviderAdapter,
  PaymentSourceResult,
} from '../payment-provider.interface';

/** Direct Nequi integration. Only the simulated mode exists for now (NEQUI_MODE=SIMULATED). */
@Injectable()
export class NequiProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.NEQUI;
  readonly supportedMethodTypes: readonly PaymentMethodType[] = [PaymentMethodType.WALLET];
  private readonly mode: ProviderMode;

  constructor(
    private readonly simulator: PaymentGatewaySimulator,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.mode = config.get('NEQUI_MODE', { infer: true });
  }

  async createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult> {
    this.ensureSimulated();
    const phoneNumber = input.credentials.walletPhoneNumber ?? input.customer.phoneNumber;
    const providerSourceId = await this.simulator.registerSource(this.provider);

    return {
      providerSourceId,
      providerCustomerId: null,
      status: PaymentMethodStatus.ACTIVE,
      tokenExpiresAt: null,
      metadata: { simulated: true, walletPhoneLast4: lastDigits(phoneNumber) },
    };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    this.ensureSimulated();
    const decision = await this.simulator.decideCharge(this.provider);

    return {
      outcome: decision.approved ? ChargeOutcome.Approved : ChargeOutcome.Declined,
      providerTransactionId: decision.providerTransactionId,
      providerStatus: decision.approved ? 'SUCCESS' : 'REJECTED',
      failureCode: decision.approved ? null : 'NEQUI_PAYMENT_REJECTED',
      failureReason: decision.approved ? null : 'Payment rejected by Nequi',
      rawResponse: {
        simulated: true,
        reference: input.reference,
        amountInCents: input.amountInCents,
        currency: input.currency,
        processedAt: decision.processedAt.toISOString(),
      },
    };
  }

  private ensureSimulated(): void {
    if (this.mode !== ProviderMode.Simulated) {
      throw new NotImplementedException('Live Nequi integration is not implemented yet');
    }
  }
}
