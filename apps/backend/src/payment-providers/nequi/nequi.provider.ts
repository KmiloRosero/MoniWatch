import { Injectable } from '@nestjs/common';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '@prisma/client';
import { lastDigits } from '../../common/utils/mask';
import { PaymentGatewaySimulator } from '../payment-gateway.simulator';
import {
  ChargeInput,
  ChargeOutcome,
  ChargeResult,
  CreatePaymentSourceInput,
  PaymentProviderAdapter,
  PaymentSourceResult,
} from '../payment-provider.interface';

@Injectable()
export class NequiProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.NEQUI;
  readonly supportedMethodTypes: readonly PaymentMethodType[] = [PaymentMethodType.WALLET];

  constructor(private readonly simulator: PaymentGatewaySimulator) {}

  async createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult> {
    this.simulator.ensureSimulationMode(this.provider);
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
    this.simulator.ensureSimulationMode(this.provider);
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
}
