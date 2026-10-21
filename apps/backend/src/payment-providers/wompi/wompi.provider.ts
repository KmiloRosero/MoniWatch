import { Injectable } from '@nestjs/common';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '@prisma/client';
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
export class WompiProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.WOMPI;
  readonly supportedMethodTypes: readonly PaymentMethodType[] = [
    PaymentMethodType.CARD,
    PaymentMethodType.BANK_TRANSFER,
    PaymentMethodType.WALLET,
  ];

  constructor(private readonly simulator: PaymentGatewaySimulator) {}

  async createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult> {
    this.simulator.ensureSimulationMode(this.provider);
    const providerSourceId = await this.simulator.registerSource(this.provider);

    return {
      providerSourceId,
      providerCustomerId: input.customer.email,
      status: PaymentMethodStatus.ACTIVE,
      tokenExpiresAt: null,
      metadata: { simulated: true, sourceType: input.type },
    };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    this.simulator.ensureSimulationMode(this.provider);
    const decision = await this.simulator.decideCharge(this.provider);

    return {
      outcome: decision.approved ? ChargeOutcome.Approved : ChargeOutcome.Declined,
      providerTransactionId: decision.providerTransactionId,
      providerStatus: decision.approved ? 'APPROVED' : 'DECLINED',
      failureCode: decision.approved ? null : 'WOMPI_TRANSACTION_DECLINED',
      failureReason: decision.approved ? null : 'Transaction declined by Wompi',
      rawResponse: {
        simulated: true,
        reference: input.reference,
        paymentSourceId: input.providerSourceId,
        amountInCents: input.amountInCents,
        currency: input.currency,
        processedAt: decision.processedAt.toISOString(),
      },
    };
  }
}
