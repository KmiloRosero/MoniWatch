import { Module } from '@nestjs/common';
import { NequiProvider } from './nequi/nequi.provider';
import { PaymentGatewaySimulator } from './payment-gateway.simulator';
import { PaymentProviderFactory } from './payment-provider.factory';
import { WompiClient } from './wompi/wompi.client';
import { WompiProvider } from './wompi/wompi.provider';

@Module({
  providers: [PaymentGatewaySimulator, NequiProvider, WompiClient, WompiProvider, PaymentProviderFactory],
  exports: [PaymentProviderFactory],
})
export class PaymentProvidersModule {}
