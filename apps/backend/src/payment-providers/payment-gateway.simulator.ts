import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EnvironmentVariables } from '../config/env.validation';

export interface SimulatedDecision {
  approved: boolean;
  providerTransactionId: string;
  processedAt: Date;
}

/**
 * Stand-in for a provider API while its mode is SIMULATED.
 * Latency and approval rate come from configuration, never from fixed values.
 */
@Injectable()
export class PaymentGatewaySimulator {
  private readonly approvalRate: number;
  private readonly latencyMs: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.approvalRate = config.get('PAYMENT_SIMULATOR_APPROVAL_RATE', { infer: true });
    this.latencyMs = config.get('PAYMENT_SIMULATOR_LATENCY_MS', { infer: true });
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
