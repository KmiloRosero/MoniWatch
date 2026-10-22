import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { MerchantGatewayAccount } from '../payment-provider.interface';

const REQUEST_TIMEOUT_MS = 15_000;
/** Acceptance tokens are pre-signed by Wompi; refreshing them every few minutes is plenty. */
const ACCEPTANCE_CACHE_MS = 5 * 60_000;
/** A transaction id that never exists: looking it up only tells whether the private key is accepted. */
const PRIVATE_KEY_PROBE_TRANSACTION_ID = '0-0-0';

export type WompiTransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface WompiAcceptance {
  acceptanceToken: string;
  termsUrl: string;
  personalDataAuthToken: string;
  personalDataUrl: string;
}

export interface WompiMerchantInfo {
  name: string;
  active: boolean;
  acceptance: WompiAcceptance;
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

/** The parts of a merchant account each call needs; never logged. */
type WompiPublicAccount = Pick<MerchantGatewayAccount, 'apiUrl' | 'publicKey'>;
type WompiPrivateAccount = Pick<MerchantGatewayAccount, 'apiUrl' | 'privateKey'>;
type WompiChargingAccount = Pick<MerchantGatewayAccount, 'apiUrl' | 'privateKey' | 'integritySecret'>;

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
    name?: string;
    active?: boolean;
    presigned_acceptance?: { acceptance_token?: string; permalink?: string };
    presigned_personal_data_auth?: { acceptance_token?: string; permalink?: string };
  };
}

/**
 * Thin HTTP client for the Wompi API (https://docs.wompi.co). Stateless: every call names
 * the merchant account it acts for. Private-key calls only ever happen here, on the server.
 */
@Injectable()
export class WompiClient {
  private readonly logger = new Logger(WompiClient.name);
  /** Keyed by public key: each merchant has its own pre-signed acceptance tokens. */
  private readonly infoCache = new Map<string, { value: WompiMerchantInfo; fetchedAt: number }>();

  /** Merchant name, status and the terms the end user must accept before a card is saved. */
  async getMerchantInfo(account: WompiPublicAccount): Promise<WompiMerchantInfo> {
    const cached = this.infoCache.get(account.publicKey);
    if (cached && Date.now() - cached.fetchedAt < ACCEPTANCE_CACHE_MS) {
      return cached.value;
    }

    // GET /merchants/info replaces GET /merchants/:public_key (deprecated by Wompi on 2026-10-31).
    const body = await this.request<MerchantInfoResponse>(account.apiUrl, 'GET', '/merchants/info', {
      headers: { 'x-merchant-public-key': account.publicKey },
    });
    const terms = body.data?.presigned_acceptance;
    const personalData = body.data?.presigned_personal_data_auth;
    if (!terms?.acceptance_token || !terms.permalink || !personalData?.acceptance_token || !personalData.permalink) {
      throw new WompiApiError(502, 'INVALID_RESPONSE', 'Wompi merchant info is missing acceptance tokens');
    }

    const value: WompiMerchantInfo = {
      name: body.data?.name ?? '',
      active: body.data?.active === true,
      acceptance: {
        acceptanceToken: terms.acceptance_token,
        termsUrl: terms.permalink,
        personalDataAuthToken: personalData.acceptance_token,
        personalDataUrl: personalData.permalink,
      },
    };
    this.infoCache.set(account.publicKey, { value, fetchedAt: Date.now() });
    return value;
  }

  async getAcceptance(account: WompiPublicAccount): Promise<WompiAcceptance> {
    return (await this.getMerchantInfo(account)).acceptance;
  }

  /** Looks up a transaction id that never exists: 404 means the key is accepted, 401/403 that it is not. */
  async verifyPrivateKey(account: WompiPrivateAccount): Promise<boolean> {
    try {
      await this.getTransaction(account, PRIVATE_KEY_PROBE_TRANSACTION_ID);
      return true;
    } catch (error) {
      if (error instanceof WompiApiError && error.status === 404) return true;
      if (error instanceof WompiApiError && (error.status === 401 || error.status === 403)) return false;
      throw error;
    }
  }

  async createCardPaymentSource(
    account: WompiPrivateAccount,
    input: { cardToken: string; customerEmail: string; acceptanceToken: string; personalDataAuthToken: string },
  ): Promise<WompiPaymentSource> {
    const body = await this.request<{ data: WompiPaymentSource }>(account.apiUrl, 'POST', '/payment_sources', {
      privateKey: account.privateKey,
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

  async createTransaction(
    account: WompiChargingAccount,
    input: { reference: string; amountInCents: number; currency: string; customerEmail: string; paymentSourceId: number },
  ): Promise<WompiTransaction> {
    const body = await this.request<{ data: WompiTransaction }>(account.apiUrl, 'POST', '/transactions', {
      privateKey: account.privateKey,
      json: {
        amount_in_cents: input.amountInCents,
        currency: input.currency,
        signature: integritySignature(account.integritySecret, input.reference, input.amountInCents, input.currency),
        customer_email: input.customerEmail,
        reference: input.reference,
        payment_source_id: input.paymentSourceId,
        // Watch payments are single-installment card charges.
        payment_method: { installments: 1 },
      },
    });
    return body.data;
  }

  async getTransaction(account: WompiPrivateAccount, id: string): Promise<WompiTransaction> {
    const body = await this.request<{ data: WompiTransaction }>(
      account.apiUrl,
      'GET',
      `/transactions/${encodeURIComponent(id)}`,
      { privateKey: account.privateKey },
    );
    return body.data;
  }

  private async request<T>(
    apiUrl: string,
    method: 'GET' | 'POST',
    path: string,
    options: { privateKey?: string; json?: unknown; headers?: Record<string, string> } = {},
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
    if (options.privateKey) headers.Authorization = `Bearer ${options.privateKey}`;
    if (options.json !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(`${apiUrl.replace(/\/+$/, '')}${path}`, {
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

/** SHA256(reference + amountInCents + currency + integritySecret), lowercase hex (Wompi "firma de integridad"). */
export function integritySignature(
  integritySecret: string,
  reference: string,
  amountInCents: number,
  currency: string,
): string {
  return createHash('sha256').update(`${reference}${amountInCents}${currency}${integritySecret}`).digest('hex');
}
