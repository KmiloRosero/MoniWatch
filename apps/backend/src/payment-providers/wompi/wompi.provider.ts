import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '@prisma/client';
import { EnvironmentVariables, ProviderMode } from '../../config/env.validation';
import { PaymentGatewaySimulator } from '../payment-gateway.simulator';
import {
  ChargeInput,
  ChargeOutcome,
  ChargeResult,
  CheckoutConfig,
  CreatePaymentSourceInput,
  PaymentProviderAdapter,
  PaymentSourceResult,
} from '../payment-provider.interface';
import { WompiApiError, WompiClient, WompiTransaction } from './wompi.client';

const WOMPI_SOURCE_AVAILABLE = 'AVAILABLE';

/** Wompi final statuses mapped to charge outcomes; PENDING stays pending. */
const OUTCOME_BY_STATUS: Record<WompiTransaction['status'], ChargeOutcome> = {
  PENDING: ChargeOutcome.Pending,
  APPROVED: ChargeOutcome.Approved,
  DECLINED: ChargeOutcome.Declined,
  VOIDED: ChargeOutcome.Declined,
  ERROR: ChargeOutcome.Error,
};

@Injectable()
export class WompiProvider implements PaymentProviderAdapter {
  readonly provider = PaymentProvider.WOMPI;
  /** Cards only: Nequi wallets go through the Nequi provider. */
  readonly supportedMethodTypes: readonly PaymentMethodType[] = [PaymentMethodType.CARD];
  private readonly mode: ProviderMode;
  private readonly pollAttempts: number;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly simulator: PaymentGatewaySimulator,
    private readonly client: WompiClient,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.mode = config.get('WOMPI_MODE', { infer: true });
    this.pollAttempts = config.get('WOMPI_STATUS_POLL_ATTEMPTS', { infer: true });
    this.pollIntervalMs = config.get('WOMPI_STATUS_POLL_INTERVAL_MS', { infer: true });
  }

  private get isLive(): boolean {
    return this.mode === ProviderMode.Live;
  }

  async getCheckoutConfig(): Promise<CheckoutConfig> {
    if (!this.isLive) {
      return { mode: 'SIMULATED', publicKey: null, apiUrl: null, acceptance: null };
    }
    const acceptance = await this.wrap(() => this.client.getAcceptance());
    return { mode: 'LIVE', publicKey: this.client.merchantPublicKey, apiUrl: this.client.baseUrl, acceptance };
  }

  async createPaymentSource(input: CreatePaymentSourceInput): Promise<PaymentSourceResult> {
    if (!this.isLive) {
      const providerSourceId = await this.simulator.registerSource(this.provider);
      return {
        providerSourceId,
        providerCustomerId: input.customer.email,
        status: PaymentMethodStatus.ACTIVE,
        tokenExpiresAt: null,
        metadata: { simulated: true, sourceType: input.type },
      };
    }

    if (!input.acceptance) {
      throw new BadRequestException('Wompi terms must be accepted to save a card');
    }
    const acceptance = input.acceptance;

    const source = await this.wrap(() =>
      this.client.createCardPaymentSource({
        cardToken: input.credentials.providerToken,
        customerEmail: input.customer.email,
        acceptanceToken: acceptance.acceptanceToken,
        personalDataAuthToken: acceptance.personalDataAuthToken,
      }),
    );

    return {
      providerSourceId: String(source.id),
      providerCustomerId: input.customer.email,
      status: source.status === WOMPI_SOURCE_AVAILABLE ? PaymentMethodStatus.ACTIVE : PaymentMethodStatus.FAILED_VALIDATION,
      tokenExpiresAt: null,
      metadata: { wompiSourceStatus: source.status },
    };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isLive) return this.simulatedCharge(input);

    const paymentSourceId = Number(input.providerSourceId);
    if (!Number.isInteger(paymentSourceId)) {
      throw new BadRequestException('Card has no Wompi payment source');
    }

    let transaction: WompiTransaction;
    try {
      transaction = await this.client.createTransaction({
        reference: input.reference,
        amountInCents: input.amountInCents,
        currency: input.currency,
        customerEmail: input.customer.email,
        paymentSourceId,
      });
    } catch (error) {
      // A 4xx is a definitive "no": nothing was charged.
      if (error instanceof WompiApiError && error.status < 500) {
        return this.rejected(error, input.reference);
      }
      // Timeout or 5xx: Wompi may still have created the charge. Never report it as failed;
      // the webhook (matched by our reference) or the expiration sweep will close it.
      return this.unknownOutcome(input.reference);
    }

    // Card charges start PENDING; most settle within seconds, so wait briefly for the final answer.
    for (let attempt = 0; attempt < this.pollAttempts && transaction.status === 'PENDING'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
      try {
        transaction = await this.client.getTransaction(transaction.id);
      } catch {
        break; // Keep it PENDING with its Wompi id; reconciliation finishes the job.
      }
    }

    return this.toChargeResult(transaction);
  }

  private rejected(error: WompiApiError, reference: string): ChargeResult {
    return {
      outcome: ChargeOutcome.Declined,
      providerTransactionId: null,
      providerStatus: 'REJECTED',
      failureCode: `WOMPI_${error.type}`,
      failureReason: error.message,
      rawResponse: { reference, httpStatus: error.status, errorType: error.type },
    };
  }

  private unknownOutcome(reference: string): ChargeResult {
    return {
      outcome: ChargeOutcome.Pending,
      providerTransactionId: null,
      providerStatus: 'UNKNOWN',
      failureCode: null,
      failureReason: null,
      rawResponse: { reference },
    };
  }

  async getChargeStatus(providerTransactionId: string): Promise<ChargeResult> {
    if (!this.isLive) {
      // The simulator settles synchronously, so there is never anything to reconcile.
      return {
        outcome: ChargeOutcome.Pending,
        providerTransactionId,
        providerStatus: 'PENDING',
        failureCode: null,
        failureReason: null,
        rawResponse: { simulated: true },
      };
    }
    return this.toChargeResult(await this.wrap(() => this.client.getTransaction(providerTransactionId)));
  }

  private toChargeResult(transaction: WompiTransaction): ChargeResult {
    const outcome = OUTCOME_BY_STATUS[transaction.status] ?? ChargeOutcome.Pending;
    const failed = outcome === ChargeOutcome.Declined || outcome === ChargeOutcome.Error;
    return {
      outcome,
      providerTransactionId: transaction.id,
      providerStatus: transaction.status,
      failureCode: failed ? `WOMPI_${transaction.status}` : null,
      failureReason: failed ? (transaction.status_message ?? 'Transaction not approved by Wompi') : null,
      rawResponse: {
        id: transaction.id,
        status: transaction.status,
        statusMessage: transaction.status_message ?? null,
        reference: transaction.reference,
        amountInCents: transaction.amount_in_cents,
        currency: transaction.currency,
      },
    };
  }

  private async simulatedCharge(input: ChargeInput): Promise<ChargeResult> {
    const decision = await this.simulator.decideCharge(this.provider);
    return {
      outcome: decision.approved ? ChargeOutcome.Approved : ChargeOutcome.Declined,
      providerTransactionId: decision.providerTransactionId,
      providerStatus: decision.approved ? 'APPROVED' : 'DECLINED',
      failureCode: decision.approved ? null : 'WOMPI_DECLINED',
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

  /** Wompi validation errors become 400s for the app; anything else is a gateway failure. */
  private async wrap<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof WompiApiError && error.status === 422) {
        throw new BadRequestException(`Wompi rejected the request: ${error.message}`);
      }
      if (error instanceof WompiApiError) {
        throw new BadGatewayException('Wompi is not available right now');
      }
      throw new BadGatewayException('Could not reach Wompi');
    }
  }
}
