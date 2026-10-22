import { Module } from '@nestjs/common';
import { PaymentProvidersModule } from '../../payment-providers/payment-providers.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

@Module({
  imports: [PaymentProvidersModule, MerchantsModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
