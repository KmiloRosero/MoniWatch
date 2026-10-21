import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/env.validation';
import { HashingService } from '../../../infrastructure/crypto/hashing.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BLOCKED_USER_STATUSES, userPublicSelect } from '../auth.constants';
import { LoginDto } from '../dto/login.dto';
import { RefreshSessionDto } from '../dto/refresh-session.dto';
import { RegisterDto } from '../dto/register.dto';
import { TokenService } from './token.service';

const MS_PER_DAY = 86_400_000;
const USER_AGENT_MAX_LENGTH = 255;

export interface ClientContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly refreshTokenTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.refreshTokenTtlMs = config.get('USER_REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY;
  }

  async register(dto: RegisterDto, client: ClientContext) {
    const passwordHash = await this.hashing.hashSecret(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        documentType: dto.documentType,
        documentNumber: dto.documentNumber,
      },
      select: userPublicSelect,
    });

    return { ...(await this.openSession(user.id, client)), user };
  }

  async login(dto: LoginDto, client: ClientContext) {
    const credentials = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, passwordHash: true, status: true, deletedAt: true },
    });

    const isValid =
      credentials !== null &&
      credentials.deletedAt === null &&
      (await this.hashing.compareSecret(dto.password, credentials.passwordHash));

    if (!credentials || !isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (BLOCKED_USER_STATUSES.includes(credentials.status)) {
      throw new ForbiddenException('User account is not available');
    }

    const user = await this.prisma.user.update({
      where: { id: credentials.id },
      data: { lastLoginAt: new Date() },
      select: userPublicSelect,
    });

    return { ...(await this.openSession(user.id, client)), user };
  }

  /** Rotates the refresh token: each one works exactly once. */
  async refresh(dto: RefreshSessionDto) {
    const currentHash = this.hashing.sha256(dto.refreshToken);
    const now = new Date();

    const session = await this.prisma.userSession.findUnique({
      where: { refreshTokenHash: currentHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true, deletedAt: true } },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.deletedAt ||
      BLOCKED_USER_STATUSES.includes(session.user.status)
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const refreshToken = this.hashing.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + this.refreshTokenTtlMs);

    const { count } = await this.prisma.userSession.updateMany({
      where: { id: session.id, refreshTokenHash: currentHash, revokedAt: null },
      data: { refreshTokenHash: this.hashing.sha256(refreshToken), expiresAt: refreshTokenExpiresAt, lastUsedAt: now },
    });

    if (count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.tokens.signUserAccessToken(session.userId, session.id);
    return { ...accessToken, refreshToken, refreshTokenExpiresAt };
  }

  async logout(userSessionId: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { id: userSessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ...userPublicSelect, paymentPinHash: true },
    });

    const { paymentPinHash, ...profile } = user;
    return { ...profile, hasPaymentPin: paymentPinHash !== null };
  }

  private async openSession(userId: string, client: ClientContext) {
    const refreshToken = this.hashing.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(Date.now() + this.refreshTokenTtlMs);

    const session = await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: this.hashing.sha256(refreshToken),
        expiresAt: refreshTokenExpiresAt,
        userAgent: client.userAgent?.slice(0, USER_AGENT_MAX_LENGTH),
        ipAddress: client.ipAddress,
      },
      select: { id: true },
    });

    const accessToken = await this.tokens.signUserAccessToken(userId, session.id);
    return { ...accessToken, refreshToken, refreshTokenExpiresAt };
  }
}
