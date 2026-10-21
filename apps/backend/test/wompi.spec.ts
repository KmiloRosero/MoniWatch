import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Currency, PaymentMethodStatus, PaymentMethodType } from '@prisma/client';
import { createHash } from 'crypto';
import { EnvironmentVariables } from '../src/config/env.validation';
import { PaymentGatewaySimulator } from '../src/payment-providers/payment-gateway.simulator';
import { ChargeInput, ChargeOutcome } from '../src/payment-providers/payment-provider.interface';
import { WompiApiError, WompiClient, WompiTransaction } from '../src/payment-providers/wompi/wompi.client';
import { WompiProvider } from '../src/payment-providers/wompi/wompi.provider';

function configWith(values: Record<string, unknown>): ConfigService<EnvironmentVariables, true> {
  return { get: (key: string) => values[key] } as unknown as ConfigService<EnvironmentVariables, true>;
}

const liveConfig = configWith({
  WOMPI_MODE: 'LIVE',
  WOMPI_STATUS_POLL_ATTEMPTS: 3,
  WOMPI_STATUS_POLL_INTERVAL_MS: 1,
  WOMPI_API_URL: 'https://sandbox.wompi.co/v1',
  WOMPI_PUBLIC_KEY: 'pub_test_example',
  WOMPI_PRIVATE_KEY: 'prv_test_example',
  WOMPI_INTEGRITY_SECRET: 'test_integrity_example',
});

const transaction = (status: WompiTransaction['status']): WompiTransaction => ({
  id: '1234-1610641025-49201',
  status,
  status_message: status === 'DECLINED' ? 'Fondos insuficientes' : null,
  reference: 'ref-1',
  amount_in_cents: 2_000_000,
  currency: 'COP',
});

const chargeInput: ChargeInput = {
  reference: 'ref-1',
  amountInCents: 2_000_000,
  currency: Currency.COP,
  description: null,
  credentials: { providerToken: 'tok_test_1', walletPhoneNumber: null },
  providerSourceId: '3891',
  customer: { email: 'ana@example.com', phoneNumber: '+573001234567', fullName: 'Ana Diaz' },
};

function fakeClient() {
  return {
    createTransaction: jest.fn(),
    getTransaction: jest.fn(),
    createCardPaymentSource: jest.fn(),
    getAcceptance: jest.fn(),
    merchantPublicKey: 'pub_test_example',
    baseUrl: 'https://sandbox.wompi.co/v1',
  };
}

function liveProvider(client: ReturnType<typeof fakeClient>) {
  return new WompiProvider({} as PaymentGatewaySimulator, client as unknown as WompiClient, liveConfig);
}

describe('WompiProvider (LIVE)', () => {
  it('waits for the final status of a card charge', async () => {
    const client = fakeClient();
    client.createTransaction.mockResolvedValue(transaction('PENDING'));
    client.getTransaction.mockResolvedValueOnce(transaction('PENDING')).mockResolvedValueOnce(transaction('APPROVED'));

    const result = await liveProvider(client).charge(chargeInput);

    expect(result).toMatchObject({ outcome: ChargeOutcome.Approved, providerTransactionId: '1234-1610641025-49201' });
    expect(client.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ reference: 'ref-1', amountInCents: 2_000_000, paymentSourceId: 3891 }),
    );
  });

  it('maps DECLINED to a decline with Wompi status message', async () => {
    const client = fakeClient();
    client.createTransaction.mockResolvedValue(transaction('DECLINED'));

    const result = await liveProvider(client).charge(chargeInput);
    expect(result).toMatchObject({
      outcome: ChargeOutcome.Declined,
      failureCode: 'WOMPI_DECLINED',
      failureReason: 'Fondos insuficientes',
    });
  });

  it('treats a 4xx from Wompi as a definitive rejection', async () => {
    const client = fakeClient();
    client.createTransaction.mockRejectedValue(new WompiApiError(422, 'INPUT_VALIDATION_ERROR', 'bad source'));

    const result = await liveProvider(client).charge(chargeInput);
    expect(result).toMatchObject({ outcome: ChargeOutcome.Declined, failureCode: 'WOMPI_INPUT_VALIDATION_ERROR' });
  });

  it.each([
    ['a timeout', new TypeError('fetch failed')],
    ['a 5xx', new WompiApiError(502, 'UNKNOWN', 'bad gateway')],
  ])('never reports %s while creating the charge as failed', async (_label, error) => {
    const client = fakeClient();
    client.createTransaction.mockRejectedValue(error);

    const result = await liveProvider(client).charge(chargeInput);
    expect(result).toMatchObject({ outcome: ChargeOutcome.Pending, providerTransactionId: null });
  });

  it('keeps the charge pending with its id when polling fails', async () => {
    const client = fakeClient();
    client.createTransaction.mockResolvedValue(transaction('PENDING'));
    client.getTransaction.mockRejectedValue(new TypeError('fetch failed'));

    const result = await liveProvider(client).charge(chargeInput);
    expect(result).toMatchObject({ outcome: ChargeOutcome.Pending, providerTransactionId: '1234-1610641025-49201' });
  });

  it('requires the user to accept Wompi terms before saving a card', async () => {
    const client = fakeClient();
    const provider = liveProvider(client);
    const base = {
      type: PaymentMethodType.CARD,
      credentials: { providerToken: 'tok_test_1', walletPhoneNumber: null },
      customer: chargeInput.customer,
    };

    await expect(provider.createPaymentSource({ ...base, acceptance: null })).rejects.toBeInstanceOf(BadRequestException);

    client.createCardPaymentSource.mockResolvedValue({ id: 3891, status: 'AVAILABLE', type: 'CARD' });
    const source = await provider.createPaymentSource({
      ...base,
      acceptance: { acceptanceToken: 'acc', personalDataAuthToken: 'pda' },
    });
    expect(source).toMatchObject({ providerSourceId: '3891', status: PaymentMethodStatus.ACTIVE });
    expect(client.createCardPaymentSource).toHaveBeenCalledWith({
      cardToken: 'tok_test_1',
      customerEmail: 'ana@example.com',
      acceptanceToken: 'acc',
      personalDataAuthToken: 'pda',
    });
  });

  it('exposes the public key and acceptance links to the app', async () => {
    const client = fakeClient();
    client.getAcceptance.mockResolvedValue({
      acceptanceToken: 'acc',
      termsUrl: 'https://wompi.example/terms.pdf',
      personalDataAuthToken: 'pda',
      personalDataUrl: 'https://wompi.example/data.pdf',
    });

    const config = await liveProvider(client).getCheckoutConfig();
    expect(config).toMatchObject({ mode: 'LIVE', publicKey: 'pub_test_example', acceptance: { acceptanceToken: 'acc' } });
  });
});

describe('WompiClient', () => {
  const client = new WompiClient(liveConfig);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('builds the integrity signature as lowercase SHA256(reference + amount + currency + secret)', () => {
    const expected = createHash('sha256').update('ref-12000000COPtest_integrity_example').digest('hex');
    expect(client.integritySignature('ref-1', 2_000_000, 'COP')).toBe(expected);
  });

  it('reads acceptance tokens from /merchants/info with the public key header', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            presigned_acceptance: { acceptance_token: 'acc', permalink: 'https://t', type: 'END_USER_POLICY' },
            presigned_personal_data_auth: { acceptance_token: 'pda', permalink: 'https://p', type: 'PERSONAL_DATA_AUTH' },
          },
        }),
        { status: 200 },
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const acceptance = await new WompiClient(liveConfig).getAcceptance();

    expect(acceptance).toEqual({ acceptanceToken: 'acc', termsUrl: 'https://t', personalDataAuthToken: 'pda', personalDataUrl: 'https://p' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://sandbox.wompi.co/v1/merchants/info');
    expect((init.headers as Record<string, string>)['x-merchant-public-key']).toBe('pub_test_example');
  });

  it('turns Wompi error bodies into WompiApiError', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { type: 'INPUT_VALIDATION_ERROR', reason: 'invalid token' } }), { status: 422 }),
    ) as unknown as typeof fetch;

    await expect(client.getTransaction('x')).rejects.toMatchObject({ status: 422, type: 'INPUT_VALIDATION_ERROR' });
  });
});
