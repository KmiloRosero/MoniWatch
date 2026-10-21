import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentGatewaySimulator } from '../src/payment-providers/payment-gateway.simulator';
import { addNequi, api, Api, createTestApp, pairWatch, registerUser } from './helpers';

describe('Payment methods, transactions and the watch', () => {
  let app: INestApplication;
  let client: Api;

  beforeAll(async () => {
    app = await createTestApp();
    client = api(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const card = (token: string) => ({
    provider: 'WOMPI',
    type: 'CARD',
    providerToken: token,
    last4: '4242',
    cardBrand: 'visa',
    cardExpMonth: 12,
    cardExpYear: new Date().getFullYear() + 3,
  });

  describe('payment methods', () => {
    it('stores Nequi and cards, makes the first one default, never exposes tokens', async () => {
      const user = await registerUser(client);
      const nequi = await client
        .post('/payment-methods', { provider: 'NEQUI', type: 'WALLET', providerToken: user.phoneNumber }, user.accessToken)
        .expect(201);
      expect(nequi.body).toMatchObject({ isDefault: true, status: 'ACTIVE', maskedPhoneNumber: expect.stringMatching(/\*+\d{4}$/) });
      expect(nequi.body.encryptedToken).toBeUndefined();

      const visa = await client.post('/payment-methods', card(`tok_${randomUUID()}`), user.accessToken).expect(201);
      expect(visa.body).toMatchObject({ isDefault: false, cardBrand: 'VISA', displayLabel: 'VISA ****4242' });

      const list = await client.get('/payment-methods', user.accessToken).expect(200);
      expect(list.body).toHaveLength(2);
      expect(list.body[0].id).toBe(nequi.body.id);
    });

    it('rejects duplicates, unsupported combinations and expired cards', async () => {
      const user = await registerUser(client);
      const token = `tok_${randomUUID()}`;
      await client.post('/payment-methods', card(token), user.accessToken).expect(201);
      await client.post('/payment-methods', card(token), user.accessToken).expect(409);
      await client.post('/payment-methods', { ...card('x'), provider: 'NEQUI' }, user.accessToken).expect(400);
      await client.post('/payment-methods', { ...card(`tok_${randomUUID()}`), cardExpYear: 2001 }, user.accessToken).expect(400);
    });

    it('switches the default and revokes', async () => {
      const user = await registerUser(client);
      const first = await addNequi(client, user.accessToken, user.phoneNumber);
      const second = (await client.post('/payment-methods', card(`tok_${randomUUID()}`), user.accessToken).expect(201)).body;

      await client.patch(`/payment-methods/${second.id}/default`, undefined, user.accessToken).expect(200);
      const list = (await client.get('/payment-methods', user.accessToken)).body as Array<{ id: string; isDefault: boolean }>;
      expect(list.find((m) => m.id === second.id)?.isDefault).toBe(true);
      expect(list.find((m) => m.id === first.id)?.isDefault).toBe(false);

      await client.delete(`/payment-methods/${second.id}`, user.accessToken).expect(204);
      const after = (await client.get('/payment-methods', user.accessToken)).body as unknown[];
      expect(after).toHaveLength(1);
    });

    it('isolates users from each other', async () => {
      const owner = await registerUser(client);
      const stranger = await registerUser(client);
      const method = await addNequi(client, owner.accessToken, owner.phoneNumber);
      await client.get(`/payment-methods/${method.id}`, stranger.accessToken).expect(404);
      await client.delete(`/payment-methods/${method.id}`, stranger.accessToken).expect(404);
    });
  });

  describe('transactions', () => {
    it('approves a payment and records PENDING -> PROCESSING -> APPROVED', async () => {
      const user = await registerUser(client);
      const method = await addNequi(client, user.accessToken, user.phoneNumber);
      const response = await client
        .post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: method.id, amountInCents: 2_000_000, currency: 'COP' }, user.accessToken)
        .expect(201);
      expect(response.body).toMatchObject({ status: 'APPROVED', channel: 'MOBILE', provider: 'NEQUI' });
      expect(response.body.providerTransactionId).toEqual(expect.any(String));
    });

    it('marks a provider decline as FAILED', async () => {
      const simulator = app.get(PaymentGatewaySimulator);
      jest.spyOn(simulator, 'decideCharge').mockResolvedValueOnce({
        approved: false,
        providerTransactionId: `nequi-txn-${randomUUID()}`,
        processedAt: new Date(),
      });

      const user = await registerUser(client);
      const method = await addNequi(client, user.accessToken, user.phoneNumber);
      const response = await client
        .post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: method.id, amountInCents: 1_000_000, currency: 'COP' }, user.accessToken)
        .expect(201);
      expect(response.body).toMatchObject({ status: 'FAILED', failureCode: 'NEQUI_PAYMENT_REJECTED' });
    });

    it('is idempotent: same key returns the same transaction, different payload is rejected', async () => {
      const user = await registerUser(client);
      const method = await addNequi(client, user.accessToken, user.phoneNumber);
      const body = { idempotencyKey: randomUUID(), paymentMethodId: method.id, amountInCents: 500_000, currency: 'COP' };

      const first = await client.post('/transactions', body, user.accessToken).expect(201);
      const replay = await client.post('/transactions', body, user.accessToken).expect(201);
      expect(replay.body.id).toBe(first.body.id);

      await client.post('/transactions', { ...body, amountInCents: 999 }, user.accessToken).expect(409);
    });

    it('uses the default method when none is given and paginates history', async () => {
      const user = await registerUser(client);
      await addNequi(client, user.accessToken, user.phoneNumber);
      for (let i = 0; i < 3; i++) {
        await client
          .post('/transactions', { idempotencyKey: randomUUID(), amountInCents: 100_000 * (i + 1), currency: 'COP' }, user.accessToken)
          .expect(201);
      }

      const page1 = await client.get('/transactions?limit=2', user.accessToken).expect(200);
      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.nextCursor).toEqual(expect.any(String));

      const page2 = await client.get(`/transactions?limit=2&cursor=${page1.body.nextCursor}`, user.accessToken).expect(200);
      expect(page2.body.items).toHaveLength(1);
      expect(page2.body.nextCursor).toBeNull();
    });

    it('fails clearly without a default method', async () => {
      const user = await registerUser(client);
      await client.post('/transactions', { idempotencyKey: randomUUID(), amountInCents: 100, currency: 'COP' }, user.accessToken).expect(422);
    });
  });

  describe('watch', () => {
    it('pairs with a code typed on the phone, exactly once', async () => {
      const user = await registerUser(client);
      const created = await client.post('/devices/pairing-requests', { platform: 'WEAR_OS', deviceId: randomUUID() }).expect(201);
      expect(created.body.userCode).toMatch(/^[BCDFGHJKLMNPQRSTVWXZ]{8}$/);

      const pending = await client.post('/devices/pairing-requests/token', { deviceCode: created.body.deviceCode }).expect(200);
      expect(pending.body.status).toBe('PENDING');

      const typed = `${created.body.userCode.slice(0, 4)}-${created.body.userCode.slice(4)}`.toLowerCase();
      await client.post('/devices/pairing-requests/approve', { userCode: typed }, user.accessToken).expect(200);
      await client.post('/devices/pairing-requests/approve', { userCode: typed }, user.accessToken).expect(404);

      await new Promise((resolve) => setTimeout(resolve, 600));
      const approved = await client.post('/devices/pairing-requests/token', { deviceCode: created.body.deviceCode }).expect(200);
      expect(approved.body).toMatchObject({ status: 'APPROVED', accessToken: expect.any(String), refreshToken: expect.any(String) });

      await client.post('/devices/pairing-requests/token', { deviceCode: created.body.deviceCode }).expect(410);
    });

    it('enforces device limits and PIN, and keeps the watch away from phone-only routes', async () => {
      const user = await registerUser(client);
      const method = await addNequi(client, user.accessToken, user.phoneNumber);
      await client.put('/auth/payment-pin', { currentPassword: user.password, pin: '2468' }, user.accessToken).expect(204);
      const watch = await pairWatch(client, user.accessToken);

      await client
        .patch(`/devices/${watch.deviceSessionId}/settings`, { requirePinAboveInCents: 3_000_000, maxAmountPerTransaction: 10_000_000, dailyLimitInCents: 12_000_000 }, user.accessToken)
        .expect(200);
      const settings = await client.get('/devices/me', watch.accessToken).expect(200);
      expect(settings.body.requirePinAboveInCents).toBe(3_000_000);

      const pay = (amountInCents: number, paymentPin?: string) =>
        client.post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: method.id, amountInCents, currency: 'COP', paymentPin }, watch.accessToken);

      expect((await pay(2_000_000).expect(201)).body.channel).toBe('WATCH');
      await pay(5_000_000).expect(403);
      await pay(5_000_000, '0000').expect(403);
      await pay(5_000_000, '2468').expect(201);
      await pay(15_000_000, '2468').expect(422);
      // 2M + 5M already spent: 6M more would pass the per-payment cap but break the 12M daily limit.
      await pay(6_000_000, '2468').expect(422);

      await client.post('/payment-methods', card(`tok_${randomUUID()}`), watch.accessToken).expect(403);
      await client.get('/devices', watch.accessToken).expect(403);
    });

    it('locks the PIN after too many failures', async () => {
      const user = await registerUser(client);
      const method = await addNequi(client, user.accessToken, user.phoneNumber);
      await client.put('/auth/payment-pin', { currentPassword: user.password, pin: '2468' }, user.accessToken).expect(204);
      const watch = await pairWatch(client, user.accessToken);
      await client.patch(`/devices/${watch.deviceSessionId}/settings`, { requirePinAboveInCents: 0 }, user.accessToken).expect(200);

      const pay = (paymentPin: string) =>
        client.post('/transactions', { idempotencyKey: randomUUID(), paymentMethodId: method.id, amountInCents: 100, currency: 'COP', paymentPin }, watch.accessToken);

      for (let i = 0; i < 3; i++) await pay('1111').expect(403);
      // Locked now: even the correct PIN is refused.
      const locked = await pay('2468').expect(403);
      expect(locked.body.message).toMatch(/locked/i);
    });

    it('lets the watch unpair itself, and only itself', async () => {
      const user = await registerUser(client);
      const watch = await pairWatch(client, user.accessToken);

      await client.delete('/devices/me', user.accessToken).expect(403);
      await client.delete('/devices/me', watch.accessToken).expect(204);
      await client.get('/devices/me', watch.accessToken).expect(401);
      await client.post('/devices/token/refresh', { refreshToken: watch.refreshToken }).expect(401);
    });

    it('rotates watch tokens, revokes, and re-pairs keeping limits', async () => {
      const user = await registerUser(client);
      const watch = await pairWatch(client, user.accessToken);
      await client.patch(`/devices/${watch.deviceSessionId}/settings`, { maxAmountPerTransaction: 777 }, user.accessToken).expect(200);

      const refreshed = await client.post('/devices/token/refresh', { refreshToken: watch.refreshToken }).expect(200);
      await client.post('/devices/token/refresh', { refreshToken: watch.refreshToken }).expect(401);

      await client.delete(`/devices/${watch.deviceSessionId}`, user.accessToken).expect(204);
      await client.get('/devices/me', refreshed.body.accessToken).expect(401);

      const again = await pairWatch(client, user.accessToken, watch.deviceId);
      expect(again.deviceSessionId).toBe(watch.deviceSessionId);
      const settings = await client.get('/devices/me', again.accessToken).expect(200);
      expect(settings.body.maxAmountPerTransaction).toBe(777);
    });
  });
});
