import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PaymentProvider, Prisma, TransactionStatus, WebhookProcessingStatus } from '@prisma/client';
import { isUniqueViolation } from '../../infrastructure/prisma/prisma-errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MerchantAccountsService } from '../merchants/merchant-accounts.service';
import { OPEN_STATUSES, TransitionSource } from '../transactions/transaction.constants';
import { TransactionStateService } from '../transactions/transaction-state.service';
import { isValidWompiSignature, isWompiEvent, WompiEvent, WompiTransactionPayload } from './wompi-signature';

const WOMPI_TRANSACTION_UPDATED = 'transaction.updated';

/** Wompi final statuses mapped to ours (DECLINED/ERROR become FAILED, like the synchronous flow). */
const WOMPI_STATUS_MAP: Record<string, { to: TransactionStatus; from: TransactionStatus[] }> = {
  APPROVED: { to: TransactionStatus.APPROVED, from: OPEN_STATUSES },
  DECLINED: { to: TransactionStatus.FAILED, from: OPEN_STATUSES },
  ERROR: { to: TransactionStatus.FAILED, from: OPEN_STATUSES },
  VOIDED: { to: TransactionStatus.VOIDED, from: [...OPEN_STATUSES, TransactionStatus.APPROVED] },
};

interface MatchedTransaction {
  id: string;
  amountInCents: number;
  currency: string;
  merchantId: string | null;
}

export interface WebhookAck {
  received: true;
  duplicate?: boolean;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: TransactionStateService,
    private readonly merchantAccounts: MerchantAccountsService,
  ) {}

  /**
   * Every merchant points its Wompi events URL here. The event names our reference, which
   * leads to the merchant, whose own events secret must have signed it.
   */
  async handleWompiEvent(body: unknown): Promise<WebhookAck> {
    if (!isWompiEvent(body)) {
      throw new BadRequestException('Malformed Wompi event');
    }

    const transaction = await this.findTransaction(body.data.transaction);
    const account = transaction?.merchantId ? await this.merchantAccounts.load(transaction.merchantId) : null;
    const signatureValid = account !== null && isValidWompiSignature(body, account.eventsSecret);
    const rejection = !transaction ? 'Unknown transaction' : signatureValid ? null : 'Invalid signature';

    const recorded = await this.record(body, signatureValid, rejection);
    if (!recorded) return { received: true, duplicate: true };

    if (!transaction || !signatureValid) {
      // Per Wompi docs such events are ignored; answering 200 stops pointless retries.
      this.logger.warn(`Ignored Wompi event (${rejection}) ${recorded.id}`);
      return { received: true };
    }

    try {
      await this.process(recorded.id, body, transaction);
    } catch (error) {
      this.logger.error(`Failed to process Wompi event ${recorded.id}`, error instanceof Error ? error.stack : undefined);
      await this.finish(recorded.id, WebhookProcessingStatus.FAILED, 'Processing error');
      throw error;
    }
    return { received: true };
  }

  /** Stores the event first (audit trail + dedup). Returns null when it was already received. */
  private findTransaction(payload: WompiTransactionPayload): Promise<MatchedTransaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        provider: PaymentProvider.WOMPI,
        OR: [{ providerTransactionId: payload.id }, { reference: payload.reference }],
      },
      select: { id: true, amountInCents: true, currency: true, merchantId: true },
    });
  }

  private async record(event: WompiEvent, signatureValid: boolean, rejection: string | null) {
    try {
      return await this.prisma.webhookEvent.create({
        data: {
          provider: PaymentProvider.WOMPI,
          // The checksum is unique per event content, so Wompi retries collapse into one row.
          providerEventId: event.signature.checksum.toUpperCase(),
          eventType: event.event,
          signatureValid,
          payload: event as unknown as Prisma.InputJsonObject,
          processingStatus: rejection ? WebhookProcessingStatus.IGNORED : WebhookProcessingStatus.RECEIVED,
          processingError: rejection,
        },
        select: { id: true },
      });
    } catch (error) {
      if (isUniqueViolation(error)) return null;
      throw error;
    }
  }

  private async process(webhookEventId: string, event: WompiEvent, transaction: MatchedTransaction): Promise<void> {
    if (event.event !== WOMPI_TRANSACTION_UPDATED) {
      return this.finish(webhookEventId, WebhookProcessingStatus.IGNORED, `Unhandled event ${event.event}`);
    }

    const payload = event.data.transaction;
    const mapping = WOMPI_STATUS_MAP[payload.status];
    if (!mapping) {
      return this.finish(webhookEventId, WebhookProcessingStatus.IGNORED, `Non-final status ${payload.status}`);
    }

    // Never trust a status change whose amount does not match what we charged.
    if (transaction.amountInCents !== payload.amount_in_cents || transaction.currency !== payload.currency) {
      return this.finish(webhookEventId, WebhookProcessingStatus.FAILED, 'Amount or currency mismatch', transaction.id);
    }

    const now = new Date();
    const approved = mapping.to === TransactionStatus.APPROVED;
    const moved = await this.state.tryTransition(
      transaction.id,
      mapping.from,
      mapping.to,
      TransitionSource.Webhook,
      {
        providerTransactionId: payload.id,
        providerStatus: payload.status,
        processedAt: now,
        ...(approved ? { approvedAt: now } : {}),
        ...(mapping.to === TransactionStatus.FAILED
          ? { failedAt: now, failureCode: `WOMPI_${payload.status}`, failureReason: 'Transaction not approved by Wompi' }
          : {}),
      },
      `Wompi event ${event.event}`,
    );

    await this.finish(
      webhookEventId,
      moved ? WebhookProcessingStatus.PROCESSED : WebhookProcessingStatus.IGNORED,
      moved ? null : 'Transaction already in a final status',
      transaction.id,
    );
  }

  private async finish(
    webhookEventId: string,
    processingStatus: WebhookProcessingStatus,
    processingError: string | null,
    transactionId?: string,
  ): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { processingStatus, processingError, transactionId, processedAt: new Date() },
    });
  }
}
