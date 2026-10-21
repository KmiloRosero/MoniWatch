import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DeviceSessionStatus } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BLOCKED_USER_STATUSES } from '../auth.constants';
import { ALLOWED_PRINCIPALS_KEY, IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import {
  AccessTokenPayload,
  AuthenticatedRequest,
  AuthPrincipal,
  PrincipalKind,
} from '../types/auth-principal';

const BEARER_PREFIX = 'Bearer ';

/**
 * Global guard. Verifies the JWT and re-checks the user and device session
 * against the database on every request, so a revoked watch loses access immediately.
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    const allowedKinds = this.reflector.getAllAndOverride<PrincipalKind[] | undefined>(
      ALLOWED_PRINCIPALS_KEY,
      targets,
    ) ?? [PrincipalKind.User];

    if (!allowedKinds.includes(payload.kind)) {
      throw new ForbiddenException('This endpoint is not available for this client');
    }

    request.principal = await this.resolvePrincipal(payload);
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string {
    const header = request.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing access token');
    }
    return header.slice(BEARER_PREFIX.length).trim();
  }

  private async resolvePrincipal(payload: AccessTokenPayload): Promise<AuthPrincipal> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { status: true, deletedAt: true },
    });

    if (!user || user.deletedAt || BLOCKED_USER_STATUSES.includes(user.status)) {
      throw new UnauthorizedException('User account is not available');
    }

    if (!payload.sid) {
      throw new UnauthorizedException('Invalid access token');
    }

    if (payload.kind === PrincipalKind.User) {
      // Logging out revokes the session, which invalidates its access tokens immediately.
      const session = await this.prisma.userSession.findFirst({
        where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true },
      });
      if (!session) {
        throw new UnauthorizedException('Session is no longer active');
      }
      return { kind: PrincipalKind.User, userId: payload.sub, userSessionId: session.id, deviceSessionId: null };
    }

    const session = await this.prisma.deviceSession.findFirst({
      where: { id: payload.sid, userId: payload.sub, status: DeviceSessionStatus.ACTIVE },
      select: { id: true },
    });

    if (!session) {
      throw new UnauthorizedException('Device session is not active');
    }

    return { kind: PrincipalKind.Device, userId: payload.sub, userSessionId: null, deviceSessionId: session.id };
  }
}
