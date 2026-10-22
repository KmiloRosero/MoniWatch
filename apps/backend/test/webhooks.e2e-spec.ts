import { INestApplication } from '@nestjs/common';
import { PaymentProvider, TransactionChannel, TransactionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { TransactionExpirationService } from '../src/modules/transactions/transaction-expiration.service';
import { computeWompiChecksum, WompiEvent } from '../src/modules/webhooks/wompi-signature';
import { api, Api, cardFor, createTestApp, registerMerchant, registerUser, TestMerchant } from './helpers';

describe('Wompi webhooks and expiration sweep', () => {
  let app: INestApplication;
  let client: Api;
  let prisma: PrismaService;
  let merchant: TestMerchant;
  let secret: string;

  beforeAll(async () => {
    app = await createTestApp();
    client = api(app);
    prisma = app.get(PrismaService);
    merchant = await registerMerchant(client, (await registerUser(client)).accessToken);
    secret = merchant.eventsSecret;
  });

  afterAll(async () => {
    await app.close();
  });

  /** An in-flight Wompi transaction, as an asynchronous live charge would leave it. */
  async function openWompiTransaction(status: TransactionStatus = TransactionStatus.PROCESSING, expiresAt?: Date) {
    const user = await registerUser(client);
    const card = await client.post('/payment-methods', cardFor(merchant.id), user.accessToken).expect(201);
    const me = await client.get('/auth/me', user.accessToken).expect(200);

    return prisma.transaction.create({
      data: {
        reference: randomUUID(),
        idempotencyKey: randomUUID(),
        userId: me.body.id,
        paymentMethodId: card.body.id,
        merchantId: merchant.id,
        provider: PaymentProvider.WOMPI,
        channel: TransactionChannel.MOBILE,
        status,
        amountInCents: 4_490_000,
        currency: 'COP',
        providerTransactionId: `wompi-${randomUUID()}`,
        expiresAt: expiresAt ?? new Date(Date.now() + 60_000),
      },
    });
  }

  function signedEvent(transaction: { providerTransactionId: string | null; reference: string; amountInCents: number }, status: string, overrides: Partial<WompiEvent> = {}): WompiEvent {
    const event: WompiEvent = {
      event: 'transaction.updated',
      data: {
        transaction: {
          id: transaction.providerTransactionId!,
          status,
          reference: transaction.reference,
          amount_in_cents: transaction.amountInCents,
          currency: 'COP',
        },
      },
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum: '' },
      timestamp: Math.floor(Date.now() / 1000),
      environment: 'test',
      ...overrides,
    };
    event.signature.checksum = computeWompiChecksum(event, secret);
    return event;
  }

  it('approves an in-flight transaction and ignores the retry', async () => {
    const transaction = await openWompiTransaction();
    const event = signedEvent(transaction, 'APPROVED');

    await client.post('/webhooks/wompi', event).expect(200, { received: true });
    await client.post('/webhooks/wompi', event).expect(200, { received: true, duplicate: true });

    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe(TransactionStatus.APPROVED);
    const history = await prisma.transactionStatusHistory.findMany({ where: { transactionId: transaction.id } });
    expect(history.map((entry) => entry.source)).toContain('WEBHOOK');
  });

  it('maps DECLINED to FAILED', async () => {
    const transaction = await openWompiTransaction();
    await client.post('/webhooks/wompi', signedEvent(transaction, 'DECLINED')).expect(200);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored).toMatchObject({ status: TransactionStatus.FAILED, failureCode: 'WOMPI_DECLINED' });
  });

  it('ignores a forged signature (answering 200, as Wompi asks) and stores it for audit', async () => {
    const transaction = await openWompiTransaction();
    const event = signedEvent(transaction, 'APPROVED');
    event.signature.checksum = 'F'.repeat(64);

    await client.post('/webhooks/wompi', event).expect(200);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe(TransactionStatus.PROCESSING);
    const audit = await prisma.webhookEvent.findFirst({ where: { providerEventId: event.signature.checksum } });
    expect(audit?.signatureValid).toBe(false);
  });

  it("ignores an event signed with another merchant's secret", async () => {
    const transaction = await openWompiTransaction();
    const otherMerchant = await registerMerchant(client, (await registerUser(client)).accessToken, 'Otra Tienda');
    const event = signedEvent(transaction, 'APPROVED');
    event.signature.checksum = computeWompiChecksum(event, otherMerchant.eventsSecret);

    await client.post('/webhooks/wompi', event).expect(200);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe(TransactionStatus.PROCESSING);
  });

  it('refuses to approve when the amount does not match', async () => {
    const transaction = await openWompiTransaction();
    const event = signedEvent({ ...transaction, amountInCents: 1 }, 'APPROVED');
    await client.post('/webhooks/wompi', event).expect(200);
    const stored = await prisma.transaction.findUniqueOrThrow({ where: { id: transaction.id } });
    expect(stored.status).toBe(TransactionStatus.PROCESSING);
  });

  it('rejects malformed events', async () => {
    await client.post('/webhooks/wompi', { hello: 'world' }).expect(400);
  });

  it('expires stuck transactions and leaves fresh ones alone', async () => {
    const stuck = await openWompiTransaction(TransactionStatus.PENDING, new Date(Date.now() - 1_000));
    const fresh = await openWompiTransaction(TransactionStatus.PROCESSING);

    await app.get(TransactionExpirationService).sweep();

    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: stuck.id } })).status).toBe(TransactionStatus.EXPIRED);
    expect((await prisma.transaction.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe(TransactionStatus.PROCESSING);
  });
});
