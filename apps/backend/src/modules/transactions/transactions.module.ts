import { Module } from '@nestjs/common';
import { PaymentProvidersModule } from '../../payment-providers/payment-providers.module';
import { AuthModule } from '../auth/auth.module';
import { TransactionExpirationService } from './transaction-expiration.service';
import { TransactionSettlementService } from './transaction-settlement.service';
import { TransactionStateService } from './transaction-state.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [AuthModule, PaymentProvidersModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionStateService, TransactionSettlementService, TransactionExpirationService],
  exports: [TransactionStateService],
})
export class TransactionsModule {}
