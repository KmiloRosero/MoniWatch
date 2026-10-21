/** Mirrors the backend alphabet: consonants only, so 0/O and 1/I can never be confused. */
const PAIRING_CODE_CHARACTERS = /[^BCDFGHJKLMNPQRSTVWXZ]/g;
export const PAIRING_CODE_LENGTH = 8;
const GROUP_SIZE = PAIRING_CODE_LENGTH / 2;

export function normalizePairingCode(input: string): string {
  return input.toUpperCase().replace(PAIRING_CODE_CHARACTERS, '').slice(0, PAIRING_CODE_LENGTH);
}

/** "BCDFGHJK" -> "BCDF-GHJK", matching how the watch displays it. */
export function formatPairingCode(code: string): string {
  return code.length > GROUP_SIZE ? `${code.slice(0, GROUP_SIZE)}-${code.slice(GROUP_SIZE)}` : code;
}
