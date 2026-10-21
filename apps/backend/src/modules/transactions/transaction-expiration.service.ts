import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DevicePairingStatus, TransactionStatus } from '@prisma/client';
import { EnvironmentVariables } from '../../config/env.validation';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OPEN_STATUSES, TransitionSource } from './transaction.constants';
import { TransactionSettlementService } from './transaction-settlement.service';
import { TransactionStateService } from './transaction-state.service';

const SWEEP_INTERVAL_NAME = 'transaction-expiration-sweep';
const MS_PER_SECOND = 1_000;
const SWEEP_BATCH_SIZE = 100;

/**
 * Periodically closes what nobody will ever close: transactions stuck in PENDING/PROCESSING
 * past their expiresAt (e.g. a provider that never sent its webhook) and stale pairing requests.
 */
@Injectable()
export class TransactionExpirationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransactionExpirationService.name);
  private readonly intervalMs: number;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: TransactionStateService,
    private readonly settlement: TransactionSettlementService,
    private readonly scheduler: SchedulerRegistry,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.intervalMs = config.get('TRANSACTION_SWEEP_INTERVAL_SECONDS', { infer: true }) * MS_PER_SECOND;
  }

  onModuleInit(): void {
    const interval = setInterval(() => void this.sweep(), this.intervalMs);
    // Do not keep the process alive just for the sweeper (clean shutdowns and tests).
    interval.unref();
    this.scheduler.addInterval(SWEEP_INTERVAL_NAME, interval);
  }

  onModuleDestroy(): void {
    if (this.scheduler.doesExist('interval', SWEEP_INTERVAL_NAME)) {
      this.scheduler.deleteInterval(SWEEP_INTERVAL_NAME);
    }
  }

  /** Returns how many transactions were expired. Safe to call concurrently with payments. */
  async sweep(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const stale = await this.prisma.transaction.findMany({
        where: { status: { in: OPEN_STATUSES }, expiresAt: { lte: now } },
        select: { id: true },
        take: SWEEP_BATCH_SIZE,
      });

      let expired = 0;
      for (const { id } of stale) {
        // The provider may have settled it without a webhook reaching us.
        if (await this.settlement.reconcile(id)) continue;
        const moved = await this.state.tryTransition(
          id,
          OPEN_STATUSES,
          TransactionStatus.EXPIRED,
          TransitionSource.ExpirationSweep,
          { failureCode: 'EXPIRED', failureReason: 'No final answer from the provider before expiration', failedAt: now },
          'Expired by sweep',
        );
        if (moved) expired++;
      }

      await this.prisma.devicePairingRequest.updateMany({
        where: {
          status: { in: [DevicePairingStatus.PENDING, DevicePairingStatus.APPROVED] },
          expiresAt: { lte: now },
        },
        data: { status: DevicePairingStatus.EXPIRED },
      });

      if (expired > 0) this.logger.warn(`Expired ${expired} stale transaction(s)`);
      return expired;
    } catch (error) {
      this.logger.error('Expiration sweep failed', error instanceof Error ? error.stack : undefined);
      return 0;
    } finally {
      this.running = false;
    }
  }
}
