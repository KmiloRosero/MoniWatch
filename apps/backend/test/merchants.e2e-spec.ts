import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import {
  addNequi,
  api,
  Api,
  cardFor,
  createTestApp,
  pairWatch,
  registerMerchant,
  registerUser,
  wompiTestKeys,
} from './helpers';

describe('Merchants: own Wompi accounts, payees and paying them from the watch', () => {
  let app: INestApplication;
  let client: Api;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    client = api(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('registration', () => {
    it('stores the keys encrypted, gives a public code and never returns secrets', async () => {
      const owner = await registerUser(client);
      const keys = wompiTestKeys();
      const response = await client
        .post('/merchants', { name: 'Panadería La 14', category: 'Comida', ...keys }, owner.accessToken)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Panadería La 14',
        code: expect.stringMatching(/^[2-9BCDFGHJKLMNPQRSTVWXZ]{6}$/),
        status: 'ACTIVE',
        wompiEnvironment: 'SANDBOX',
        wompiPublicKey: keys.wompiPublicKey,
      });
      const body = JSON.stringify(response.body);
      expect(body).not.toContain(keys.wompiPrivateKey);
      expect(body).not.toContain(keys.wompiIntegritySecret);
      expect(body).not.toContain(keys.wompiEventsSecret);

      const stored = await prisma.merchant.findUniqueOrThrow({ where: { id: response.body.id } });
      expect(stored.wompiSecrets).not.toContain(keys.wompiPrivateKey);

      const mine = await client.get('/merchants/mine', owner.accessToken).expect(200);
      expect(mine.body.map((merchant: { id: string }) => merchant.id)).toEqual([response.body.id]);
    });

    it('rejects keys from mixed environments and accounts registered twice', async () => {
      const owner = await registerUser(client);
      const keys = wompiTestKeys();
      await client
        .post('/merchants', { name: 'Mixta', ...keys, wompiPrivateKey: keys.wompiPrivateKey.replace('prv_test_', 'prv_prod_') }, owner.accessToken)
        .expect(400);
      await client.post('/merchants', { name: 'Uno', ...keys }, owner.accessToken).expect(201);
      await client.post('/merchants', { name: 'Dos', ...keys }, owner.accessToken).expect(409);
    });

    it('only lets the owner deactivate, and inactive merchants disappear from search', async () => {
      const owner = await registerUser(client);
      const stranger = await registerUser(client);
      const merchant = await registerMerchant(client, owner.accessToken, `Cerrada ${randomUUID().slice(0, 6)}`);

      await client.delete(`/merchants/${merchant.id}`, stranger.accessToken).expect(404);
      await client.delete(`/merchants/${merchant.id}`, owner.accessToken).expect(204);
      const found = await client.get(`/merchants?search=${merchant.code}`, stranger.accessToken).expect(200);
      expect(found.body).toEqual([]);
    });
  });

  describe('payees', () => {
    it('finds merchants by name or code and keeps the ones the user saves', async () => {
      const owner = await registerUser(client);
      const name = `Droguería ${randomUUID().slice(0, 6)}`;
      const merchant = await registerMerchant(client, owner.accessToken, name);
      const payer = await registerUser(client);

      const byName = await client.get(`/merchants?search=${encodeURIComponent(name.toLowerCase())}`, payer.accessToken).expect(200);
      expect(byName.body).toEqual([{ id: merchant.id, name, code: merchant.code, category: null, logoUrl: null }]);
      const byCode = await client.get(`/merchants?search=${merchant.code.toLowerCase()}`, payer.accessToken).expect(200);
      expect(byCode.body.map((found: { id: string }) => found.id)).toEqual([merchant.id]);

      await client.post('/merchants/saved', { merchantId: merchant.id }, payer.accessToken).expect(201);
      await client.post('/merchants/saved', { merchantId: merchant.id }, payer.accessToken).expect(201);
      const watch = await pairWatch(client, payer.accessToken);
      const saved = await client.get('/merchants/saved', watch.accessToken).expect(200);
      expect(saved.body.map((found: { id: string }) => found.id)).toEqual([merchant.id]);

      await client.delete(`/merchants/saved/${merchant.id}`, payer.accessToken).expect(204);
      expect((await client.get('/merchants/saved', payer.accessToken).expect(200)).body).toEqual([]);
    });

    it('saves the merchant automatically when a card is linked to it', async () => {
      const merchant = await registerMerchant(client, (await registerUser(client)).accessToken);
      const payer = await registerUser(client);

      const card = await client.post('/payment-methods', cardFor(merchant.id), payer.accessToken).expect(201);
      expect(card.body.merchant).toEqual({ id: merchant.id, name: merchant.name, code: merchant.code });
      const saved = await client.get('/merchants/saved', payer.accessToken).expect(200);
      expect(saved.body.map((found: { id: string }) => found.id)).toEqual([merchant.id]);
    });
  });

  describe('paying a merchant', () => {
    it('charges a card on the merchant it was linked to, and refuses any other merchant', async () => {
      const merchant = await registerMerchant(client, (await registerUser(client)).accessToken, 'Café Central');
      const other = await registerMerchant(client, (await registerUser(client)).accessToken, 'Otro Café');
      const payer = await registerUser(client);
      const card = (await client.post('/payment-methods', cardFor(merchant.id), payer.accessToken).expect(201)).body;
      const watch = await pairWatch(client, payer.accessToken);

      const payment = await client
        .post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: card.id, merchantId: merchant.id, amountInCents: 3_750_000, currency: 'COP' }, watch.accessToken)
        .expect(201);
      expect(payment.body).toMatchObject({
        status: 'APPROVED',
        channel: 'WATCH',
        amountInCents: 3_750_000,
        merchant: { id: merchant.id, name: 'Café Central' },
      });

      await client
        .post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: card.id, merchantId: other.id, amountInCents: 1_000_000, currency: 'COP' }, watch.accessToken)
        .expect(422);
    });

    it('lets a wallet pay any merchant and records who was paid', async () => {
      const merchant = await registerMerchant(client, (await registerUser(client)).accessToken, 'Frutería');
      const payer = await registerUser(client);
      const nequi = await addNequi(client, payer.accessToken, payer.phoneNumber);
      const watch = await pairWatch(client, payer.accessToken);

      const payment = await client
        .post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: nequi.id, merchantId: merchant.id, amountInCents: 1_234_500, currency: 'COP' }, watch.accessToken)
        .expect(201);
      expect(payment.body).toMatchObject({ status: 'APPROVED', merchant: { id: merchant.id, name: 'Frutería' } });

      const history = await client.get('/transactions', payer.accessToken).expect(200);
      expect(history.body.items[0].merchant).toMatchObject({ name: 'Frutería' });
    });
  });
});
