import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TransitionSource } from './transaction.constants';

/**
 * The only place that changes Transaction.status.
 * Every transition is optimistic (it fails if another process moved the transaction first)
 * and is persisted atomically with its TransactionStatusHistory row.
 */
@Injectable()
export class TransactionStateService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(
    transactionId: string,
    from: TransactionStatus,
    to: TransactionStatus,
    source: TransitionSource,
    data: Prisma.TransactionUpdateManyMutationInput = {},
    reason: string | null = null,
  ): Promise<void> {
    const moved = await this.tryTransition(transactionId, [from], to, source, data, reason);
    if (!moved) {
      throw new ConflictException(`Transaction is no longer in status ${from}`);
    }
  }

  /** Like transition() but accepts several origin statuses and reports instead of throwing. */
  async tryTransition(
    transactionId: string,
    from: TransactionStatus[],
    to: TransactionStatus,
    source: TransitionSource,
    data: Prisma.TransactionUpdateManyMutationInput = {},
    reason: string | null = null,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.transaction.findUnique({ where: { id: transactionId }, select: { status: true } });
      if (!current || !from.includes(current.status)) return false;

      const { count } = await tx.transaction.updateMany({
        where: { id: transactionId, status: current.status },
        data: { ...data, status: to },
      });
      if (count === 0) return false;

      await tx.transactionStatusHistory.create({
        data: { transactionId, fromStatus: current.status, toStatus: to, source, reason },
      });
      return true;
    });
  }
}
