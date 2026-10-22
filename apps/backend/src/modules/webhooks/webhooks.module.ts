import { Module } from '@nestjs/common';
import { MerchantsModule } from '../merchants/merchants.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [TransactionsModule, MerchantsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
