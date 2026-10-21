import { Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EnvironmentVariables, PaymentGatewayMode } from '../config/env.validation';

export interface SimulatedDecision {
  approved: boolean;
  providerTransactionId: string;
  processedAt: Date;
}

/**
 * Stand-in for the real Nequi/Wompi HTTP APIs while PAYMENT_GATEWAY_MODE=SIMULATED.
 * Latency and approval rate are driven by configuration, never by fixed values.
 */
@Injectable()
export class PaymentGatewaySimulator {
  private readonly mode: PaymentGatewayMode;
  private readonly approvalRate: number;
  private readonly latencyMs: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.mode = config.get('PAYMENT_GATEWAY_MODE', { infer: true });
    this.approvalRate = config.get('PAYMENT_SIMULATOR_APPROVAL_RATE', { infer: true });
    this.latencyMs = config.get('PAYMENT_SIMULATOR_LATENCY_MS', { infer: true });
  }

  ensureSimulationMode(provider: PaymentProvider): void {
    if (this.mode !== PaymentGatewayMode.Simulated) {
      throw new NotImplementedException(`Live ${provider} integration is not implemented yet`);
    }
  }

  async registerSource(provider: PaymentProvider): Promise<string> {
    await this.delay();
    return `${provider.toLowerCase()}-src-${randomUUID()}`;
  }

  async decideCharge(provider: PaymentProvider): Promise<SimulatedDecision> {
    await this.delay();
    return {
      approved: Math.random() < this.approvalRate,
      providerTransactionId: `${provider.toLowerCase()}-txn-${randomUUID()}`,
      processedAt: new Date(),
    };
  }

  private delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
