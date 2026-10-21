import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { EnvironmentVariables } from '../../config/env.validation';

const REQUEST_TIMEOUT_MS = 15_000;
/** Acceptance tokens are pre-signed by Wompi; refreshing them every few minutes is plenty. */
const ACCEPTANCE_CACHE_MS = 5 * 60_000;

export type WompiTransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface WompiAcceptance {
  acceptanceToken: string;
  termsUrl: string;
  personalDataAuthToken: string;
  personalDataUrl: string;
}

export interface WompiPaymentSource {
  id: number;
  status: string;
  type: string;
}

export interface WompiTransaction {
  id: string;
  status: WompiTransactionStatus;
  status_message: string | null;
  reference: string;
  amount_in_cents: number;
  currency: string;
}

/** Wompi answered with an error body ({ error: { type, reason, messages } }). */
export class WompiApiError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    message: string,
  ) {
    super(message);
    this.name = 'WompiApiError';
  }
}

interface MerchantInfoResponse {
  data?: {
    presigned_acceptance?: { acceptance_token?: string; permalink?: string };
    presigned_personal_data_auth?: { acceptance_token?: string; permalink?: string };
  };
}

/**
 * Thin HTTP client for the Wompi API (https://docs.wompi.co).
 * Private-key calls only ever happen here, on the server.
 */
@Injectable()
export class WompiClient {
  private readonly logger = new Logger(WompiClient.name);
  private readonly apiUrl: string;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly integritySecret: string;
  private acceptanceCache: { value: WompiAcceptance; fetchedAt: number } | null = null;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.apiUrl = (config.get('WOMPI_API_URL', { infer: true }) ?? '').replace(/\/+$/, '');
    this.publicKey = config.get('WOMPI_PUBLIC_KEY', { infer: true }) ?? '';
    this.privateKey = config.get('WOMPI_PRIVATE_KEY', { infer: true }) ?? '';
    this.integritySecret = config.get('WOMPI_INTEGRITY_SECRET', { infer: true }) ?? '';
  }

  get baseUrl(): string {
    return this.apiUrl;
  }

  get merchantPublicKey(): string {
    return this.publicKey;
  }

  /** Terms + personal data authorization the end user must accept before a card is saved. */
  async getAcceptance(): Promise<WompiAcceptance> {
    if (this.acceptanceCache && Date.now() - this.acceptanceCache.fetchedAt < ACCEPTANCE_CACHE_MS) {
      return this.acceptanceCache.value;
    }

    // GET /merchants/info replaces GET /merchants/:public_key (deprecated by Wompi on 2026-10-31).
    const body = await this.request<MerchantInfoResponse>('GET', '/merchants/info', {
      headers: { 'x-merchant-public-key': this.publicKey },
    });
    const terms = body.data?.presigned_acceptance;
    const personalData = body.data?.presigned_personal_data_auth;
    if (!terms?.acceptance_token || !terms.permalink || !personalData?.acceptance_token || !personalData.permalink) {
      throw new WompiApiError(502, 'INVALID_RESPONSE', 'Wompi merchant info is missing acceptance tokens');
    }

    const value: WompiAcceptance = {
      acceptanceToken: terms.acceptance_token,
      termsUrl: terms.permalink,
      personalDataAuthToken: personalData.acceptance_token,
      personalDataUrl: personalData.permalink,
    };
    this.acceptanceCache = { value, fetchedAt: Date.now() };
    return value;
  }

  async createCardPaymentSource(input: {
    cardToken: string;
    customerEmail: string;
    acceptanceToken: string;
    personalDataAuthToken: string;
  }): Promise<WompiPaymentSource> {
    const body = await this.request<{ data: WompiPaymentSource }>('POST', '/payment_sources', {
      auth: 'private',
      json: {
        type: 'CARD',
        token: input.cardToken,
        customer_email: input.customerEmail,
        acceptance_token: input.acceptanceToken,
        accept_personal_auth: input.personalDataAuthToken,
      },
    });
    return body.data;
  }

  async createTransaction(input: {
    reference: string;
    amountInCents: number;
    currency: string;
    customerEmail: string;
    paymentSourceId: number;
  }): Promise<WompiTransaction> {
    const body = await this.request<{ data: WompiTransaction }>('POST', '/transactions', {
      auth: 'private',
      json: {
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        signature: this.integritySignature(input.reference, input.amountInCents, input.currency),
        customer_email: input.customerEmail,
        reference: input.reference,
        payment_source_id: input.paymentSourceId,
        // Watch payments are single-installment card charges.
        payment_method: { installments: 1 },
      },
    });
    return body.data;
  }

  async getTransaction(id: string): Promise<WompiTransaction> {
    const body = await this.request<{ data: WompiTransaction }>('GET', `/transactions/${encodeURIComponent(id)}`, {
      auth: 'private',
    });
    return body.data;
  }

  /** SHA256(reference + amountInCents + currency + integritySecret), lowercase hex (Wompi "firma de integridad"). */
  integritySignature(reference: string, amountInCents: number, currency: string): string {
    return createHash('sha256').update(`${reference}${amountInCents}${currency}${this.integritySecret}`).digest('hex');
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    options: { auth?: 'private'; json?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
    if (options.auth === 'private') headers.Authorization = `Bearer ${this.privateKey}`;
    if (options.json !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = (payload as { error?: { type?: string; reason?: string; messages?: unknown } } | null)?.error;
      const detail = error?.reason ?? (error?.messages ? JSON.stringify(error.messages) : `HTTP ${response.status}`);
      this.logger.warn(`Wompi ${method} ${path} failed: ${response.status} ${error?.type ?? ''} ${detail}`);
      throw new WompiApiError(response.status, error?.type ?? 'UNKNOWN', detail);
    }

    return payload as T;
  }
}
