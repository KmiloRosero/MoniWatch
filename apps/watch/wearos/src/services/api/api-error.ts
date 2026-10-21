/** The backend answered with a non-2xx status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The request never got an answer (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor(readonly cause?: unknown) {
    super('Network request failed');
    this.name = 'NetworkError';
  }
}

/** The watch has no valid session anymore (revoked or refresh token expired). */
export class SessionLostError extends Error {
  constructor() {
    super('Device session lost');
    this.name = 'SessionLostError';
  }
}
