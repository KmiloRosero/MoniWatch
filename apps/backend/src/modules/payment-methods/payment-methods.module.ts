import { Module } from '@nestjs/common';
import { PaymentProvidersModule } from '../../payment-providers/payment-providers.module';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

@Module({
  imports: [PaymentProvidersModule],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
