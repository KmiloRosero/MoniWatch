import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { API_PREFIX, configureApp } from '../src/app.setup';

export async function createTestApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  configureApp(app, { enableDocs: false });
  await app.init();
  return app;
}

export function api(app: INestApplication) {
  const server = app.getHttpServer();
  const path = (route: string) => `/${API_PREFIX}${route}`;
  return {
    get: (route: string, token?: string) => withAuth(request(server).get(path(route)), token),
    post: (route: string, body?: object, token?: string) => withAuth(request(server).post(path(route)), token).send(body),
    put: (route: string, body?: object, token?: string) => withAuth(request(server).put(path(route)), token).send(body),
    patch: (route: string, body?: object, token?: string) =>
      withAuth(request(server).patch(path(route)), token).send(body),
    delete: (route: string, token?: string) => withAuth(request(server).delete(path(route)), token),
  };
}

function withAuth(test: request.Test, token?: string): request.Test {
  return token ? test.set('Authorization', `Bearer ${token}`) : test;
}

let sequence = 0;

/** Unique, valid registration data (Colombian mobile + document). */
export function newUserData() {
  sequence += 1;
  const suffix = `${Date.now() % 1_000_000}`.padStart(6, '0') + `${sequence % 10}`;
  return {
    email: `user.${randomUUID().slice(0, 8)}@example.com`,
    phoneNumber: `+57300${suffix}`,
    password: 'S3curePass!',
    firstName: 'Ana',
    lastName: 'Diaz',
    documentType: 'CC',
    documentNumber: `10${suffix}`,
  };
}

export type Api = ReturnType<typeof api>;

/** Registers a user and returns its tokens. */
export async function registerUser(client: Api) {
  const data = newUserData();
  const response = await client.post('/auth/register', data).expect(201);
  return { ...data, accessToken: response.body.accessToken as string, refreshToken: response.body.refreshToken as string };
}

export async function addNequi(client: Api, token: string, phoneNumber: string) {
  const response = await client
    .post('/payment-methods', { provider: 'NEQUI', type: 'WALLET', providerToken: phoneNumber, walletPhoneNumber: phoneNumber }, token)
    .expect(201);
  return response.body as { id: string };
}

/** Full device authorization flow; returns the watch tokens. */
export async function pairWatch(client: Api, userToken: string, deviceId = randomUUID()) {
  const created = await client.post('/devices/pairing-requests', { platform: 'WEAR_OS', deviceId, deviceModel: 'Test Watch' }).expect(201);
  await client.post('/devices/pairing-requests/approve', { userCode: created.body.userCode }, userToken).expect(200);
  const tokens = await client.post('/devices/pairing-requests/token', { deviceCode: created.body.deviceCode }).expect(200);
  return { deviceId, ...(tokens.body as { accessToken: string; refreshToken: string; deviceSessionId: string }) };
}
