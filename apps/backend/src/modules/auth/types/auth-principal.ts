import type { Request } from 'express';

export enum PrincipalKind {
  User = 'USER',
  Device = 'DEVICE',
}

export interface AccessTokenPayload {
  sub: string;
  kind: PrincipalKind;
  /** UserSession id (mobile) or DeviceSession id (watch). */
  sid: string;
}

export interface AuthPrincipal {
  kind: PrincipalKind;
  userId: string;
  /** Set for mobile tokens. */
  userSessionId: string | null;
  /** Set for watch tokens. */
  deviceSessionId: string | null;
}

export interface AuthenticatedRequest extends Request {
  principal: AuthPrincipal;
}

export interface AccessTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
}
