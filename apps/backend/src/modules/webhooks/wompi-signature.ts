import { createHash, timingSafeEqual } from 'crypto';

export interface WompiTransactionPayload {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
}

export interface WompiEvent {
  event: string;
  data: { transaction: WompiTransactionPayload } & Record<string, unknown>;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  environment?: string;
}

export function isWompiEvent(body: unknown): body is WompiEvent {
  const event = body as WompiEvent;
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof event.event === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.data === 'object' &&
    event.data !== null &&
    typeof event.data.transaction === 'object' &&
    event.data.transaction !== null &&
    typeof event.data.transaction.id === 'string' &&
    typeof event.data.transaction.status === 'string' &&
    typeof event.data.transaction.amount_in_cents === 'number' &&
    typeof event.signature === 'object' &&
    event.signature !== null &&
    Array.isArray(event.signature.properties) &&
    typeof event.signature.checksum === 'string'
  );
}

/** Reads "transaction.status" style paths from the event data. */
function readPath(source: unknown, path: string): string {
  const value = path.split('.').reduce<unknown>((node, key) => {
    return node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined;
  }, source);
  return value === undefined || value === null ? '' : String(value);
}

/**
 * Wompi event checksum: SHA256 of the values of `signature.properties` (read from `data`,
 * in order), followed by `timestamp` and the events secret. Compared in constant time.
 */
export function computeWompiChecksum(event: WompiEvent, eventsSecret: string): string {
  const values = event.signature.properties.map((property) => readPath(event.data, property)).join('');
  return createHash('sha256').update(`${values}${event.timestamp}${eventsSecret}`).digest('hex').toUpperCase();
}

export function isValidWompiSignature(event: WompiEvent, eventsSecret: string): boolean {
  const expected = Buffer.from(computeWompiChecksum(event, eventsSecret));
  const received = Buffer.from(event.signature.checksum.toUpperCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}
