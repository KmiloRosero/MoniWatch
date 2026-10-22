import { Injectable, Logger } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PaymentProviderFactory } from '../../payment-providers/payment-provider.factory';
import { MerchantAccountsService } from '../merchants/merchant-accounts.service';
import { ChargeOutcome, ChargeResult } from '../../payment-providers/payment-provider.interface';
import { OPEN_STATUSES, TransitionSource } from './transaction.constants';
import { TransactionStateService } from './transaction-state.service';

/**
 * Turns provider answers into transaction states. Used right after charging,
 * when a client reads an open transaction, and by the expiration sweep.
 */
@Injectable()
export class TransactionSettlementService {
  private readonly logger = new Logger(TransactionSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: TransactionStateService,
    private readonly providers: PaymentProviderFactory,
    private readonly merchantAccounts: MerchantAccountsService,
  ) {}

  async apply(transactionId: string, result: ChargeResult, source: TransitionSource): Promise<void> {
    const providerData = {
      ...(result.providerTransactionId ? { providerTransactionId: result.providerTransactionId } : {}),
      providerStatus: result.providerStatus,
      providerResponse: result.rawResponse as Prisma.InputJsonObject,
    };

    if (result.outcome === ChargeOutcome.Pending) {
      // No final answer yet: remember the provider ids so a webhook or reconciliation can close it.
      await this.prisma.transaction.updateMany({
        where: { id: transactionId, status: { in: OPEN_STATUSES } },
        data: providerData,
      });
      return;
    }

    const approved = result.outcome === ChargeOutcome.Approved;
    const now = new Date();
    await this.state.tryTransition(
      transactionId,
      OPEN_STATUSES,
      approved ? TransactionStatus.APPROVED : TransactionStatus.FAILED,
      source,
      {
        ...providerData,
        failureCode: result.failureCode,
        failureReason: result.failureReason,
        processedAt: now,
        approvedAt: approved ? now : null,
        failedAt: approved ? null : now,
      },
      result.failureReason,
    );
  }

  /** Asks the provider about an open transaction. Returns true when it reached a final status. */
  async reconcile(transactionId: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { status: true, provider: true, providerTransactionId: true, merchantId: true },
    });
    if (!transaction || !OPEN_STATUSES.includes(transaction.status) || !transaction.providerTransactionId) {
      return false;
    }

    const adapter = this.providers.get(transaction.provider);
    if (!adapter.getChargeStatus) return false;

    try {
      const account = transaction.merchantId ? await this.merchantAccounts.load(transaction.merchantId) : null;
      const result = await adapter.getChargeStatus(transaction.providerTransactionId, account);
      if (result.outcome === ChargeOutcome.Pending) return false;
      await this.apply(transactionId, result, TransitionSource.Reconciliation);
      return true;
    } catch (error) {
      this.logger.warn(`Reconciliation failed for ${transactionId}: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }
}
