import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthenticatedRequest, AuthPrincipal, PrincipalKind } from '../types/auth-principal';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ALLOWED_PRINCIPALS_KEY = 'auth:allowedPrincipals';

/** Skips authentication for the decorated route. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Declares which clients may call a route. Routes without this decorator
 * are restricted to the mobile app (PrincipalKind.User).
 */
export const AllowPrincipals = (...kinds: PrincipalKind[]) =>
  SetMetadata(ALLOWED_PRINCIPALS_KEY, kinds);

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().principal,
);
