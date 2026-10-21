import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { NequiProvider } from './nequi/nequi.provider';
import { PaymentProviderAdapter } from './payment-provider.interface';
import { WompiProvider } from './wompi/wompi.provider';

@Injectable()
export class PaymentProviderFactory {
  private readonly adapters: Map<PaymentProvider, PaymentProviderAdapter>;

  constructor(nequi: NequiProvider, wompi: WompiProvider) {
    this.adapters = new Map<PaymentProvider, PaymentProviderAdapter>(
      [nequi, wompi].map((adapter) => [adapter.provider, adapter]),
    );
  }

  get(provider: PaymentProvider): PaymentProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new BadRequestException(`Unsupported payment provider: ${provider}`);
    }
    return adapter;
  }
}
