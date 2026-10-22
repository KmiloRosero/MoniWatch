import { Module } from '@nestjs/common';
import { PaymentProvidersModule } from '../../payment-providers/payment-providers.module';
import { MerchantAccountsService } from './merchant-accounts.service';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { PlatformMerchantBootstrap } from './platform-merchant.bootstrap';

@Module({
  imports: [PaymentProvidersModule],
  controllers: [MerchantsController],
  providers: [MerchantsService, MerchantAccountsService, PlatformMerchantBootstrap],
  exports: [MerchantAccountsService],
})
export class MerchantsModule {}
