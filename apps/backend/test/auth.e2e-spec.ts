import { INestApplication } from '@nestjs/common';
import { api, Api, createTestApp, newUserData, registerUser } from './helpers';

describe('Auth (mobile sessions)', () => {
  let app: INestApplication;
  let client: Api;

  beforeAll(async () => {
    app = await createTestApp();
    client = api(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers and returns access + refresh tokens without leaking secrets', async () => {
    const response = await client.post('/auth/register', newUserData()).expect(201);
    expect(response.body).toMatchObject({ tokenType: 'Bearer', accessToken: expect.any(String), refreshToken: expect.any(String) });
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate emails with 409', async () => {
    const data = newUserData();
    await client.post('/auth/register', data).expect(201);
    await client.post('/auth/register', { ...data, phoneNumber: '+573009999999', documentNumber: '99999999' }).expect(409);
  });

  it('validates input and rejects unknown fields', async () => {
    await client.post('/auth/register', { ...newUserData(), phoneNumber: '3001234567' }).expect(400);
    await client.post('/auth/register', { ...newUserData(), isAdmin: true }).expect(400);
  });

  it('logs in case-insensitively and rejects wrong passwords', async () => {
    const user = await registerUser(client);
    await client.post('/auth/login', { email: user.email.toUpperCase(), password: user.password }).expect(200);
    await client.post('/auth/login', { email: user.email, password: 'wrong-password' }).expect(401);
  });

  it('serves the profile with hasPaymentPin', async () => {
    const user = await registerUser(client);
    const before = await client.get('/auth/me', user.accessToken).expect(200);
    expect(before.body.hasPaymentPin).toBe(false);

    await client.put('/auth/payment-pin', { currentPassword: user.password, pin: '1234' }, user.accessToken).expect(204);
    const after = await client.get('/auth/me', user.accessToken).expect(200);
    expect(after.body.hasPaymentPin).toBe(true);
  });

  it('rejects setting a PIN with the wrong password', async () => {
    const user = await registerUser(client);
    await client.put('/auth/payment-pin', { currentPassword: 'nope', pin: '1234' }, user.accessToken).expect(401);
  });

  it('rotates refresh tokens and rejects reuse', async () => {
    const user = await registerUser(client);
    const refreshed = await client.post('/auth/refresh', { refreshToken: user.refreshToken }).expect(200);
    expect(refreshed.body.refreshToken).not.toBe(user.refreshToken);

    await client.post('/auth/refresh', { refreshToken: user.refreshToken }).expect(401);
    await client.get('/auth/me', refreshed.body.accessToken).expect(200);
  });

  it('logout revokes the session and its access token immediately', async () => {
    const user = await registerUser(client);
    await client.post('/auth/logout', undefined, user.accessToken).expect(204);
    await client.get('/auth/me', user.accessToken).expect(401);
    await client.post('/auth/refresh', { refreshToken: user.refreshToken }).expect(401);
  });

  it('requires a token on protected routes', async () => {
    await client.get('/payment-methods').expect(401);
    await client.get('/payment-methods', 'not-a-jwt').expect(401);
  });

  it('reports health', async () => {
    const response = await client.get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });
});
