import { env } from '@/config/env';
import { detectCardBrand } from '@/features/payment-methods/utils/card';

export interface CardDetails {
  number: string;
  cvc: string;
  expMonth: number;
  /** Four-digit year. */
  expYear: number;
  cardHolder: string;
}

export interface CardToken {
  token: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export class CardTokenizationError extends Error {
  constructor(message = 'Card tokenization failed') {
    super(message);
    this.name = 'CardTokenizationError';
  }
}

interface WompiCardTokenResponse {
  data?: {
    id?: string;
    brand?: string;
    last_four?: string;
  };
}

const pad2 = (value: number) => value.toString().padStart(2, '0');

/**
 * Card data goes straight from the phone to Wompi; the backend only ever
 * receives the resulting token plus non-sensitive display data.
 */
export function tokenizeCard(card: CardDetails): Promise<CardToken> {
  return env.paymentGatewayMode === 'LIVE' ? tokenizeWithWompi(card) : tokenizeSimulated(card);
}

async function tokenizeWithWompi(card: CardDetails): Promise<CardToken> {
  if (!env.wompiApiUrl || !env.wompiPublicKey) {
    throw new Error('EXPO_PUBLIC_WOMPI_API_URL and EXPO_PUBLIC_WOMPI_PUBLIC_KEY are required in LIVE mode');
  }

  let response: Response;
  try {
    response = await fetch(`${env.wompiApiUrl}/tokens/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.wompiPublicKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: card.number,
        cvc: card.cvc,
        exp_month: pad2(card.expMonth),
        exp_year: pad2(card.expYear % 100),
        card_holder: card.cardHolder,
      }),
    });
  } catch {
    throw new CardTokenizationError('Could not reach Wompi');
  }

  const payload = (await response.json().catch(() => null)) as WompiCardTokenResponse | null;
  const token = payload?.data?.id;
  if (!response.ok || !token) {
    throw new CardTokenizationError();
  }

  return {
    token,
    brand: payload.data?.brand ?? detectCardBrand(card.number) ?? 'CARD',
    last4: payload.data?.last_four ?? card.number.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
  };
}

/** Matches PAYMENT_GATEWAY_MODE=SIMULATED on the backend: no network call, opaque fake token. */
async function tokenizeSimulated(card: CardDetails): Promise<CardToken> {
  const randomPart = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  return {
    token: `tok_sim_${randomPart}`,
    brand: detectCardBrand(card.number) ?? 'CARD',
    last4: card.number.slice(-4),
    expMonth: card.expMonth,
    expYear: card.expYear,
  };
}
