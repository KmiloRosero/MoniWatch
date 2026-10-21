import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeviceSessionStatus, PaymentMethodStatus } from '@prisma/client';
import { EnvironmentVariables } from '../../../config/env.validation';
import { HashingService } from '../../../infrastructure/crypto/hashing.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BLOCKED_USER_STATUSES, deviceSessionPublicSelect } from '../auth.constants';
import { RefreshDeviceTokenDto } from '../dto/device-pairing.dto';
import { UpdateDeviceSettingsDto } from '../dto/update-device-settings.dto';
import { TokenService } from './token.service';

const MS_PER_DAY = 86_400_000;

/** Lifecycle of an already paired watch. Pairing itself lives in DevicePairingService. */
@Injectable()
export class DeviceSessionsService {
  private readonly refreshTokenTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.refreshTokenTtlMs = config.get('DEVICE_REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY;
  }

  /** Rotates the watch refresh token. Each refresh token can be used exactly once. */
  async refreshDeviceToken(dto: RefreshDeviceTokenDto) {
    const currentHash = this.hashing.sha256(dto.refreshToken);
    const now = new Date();

    const session = await this.prisma.deviceSession.findUnique({
      where: { refreshTokenHash: currentHash },
      select: {
        id: true,
        userId: true,
        status: true,
        refreshTokenExpiresAt: true,
        user: { select: { status: true, deletedAt: true } },
      },
    });

    if (
      !session ||
      session.status !== DeviceSessionStatus.ACTIVE ||
      !session.refreshTokenExpiresAt ||
      session.refreshTokenExpiresAt <= now ||
      session.user.deletedAt ||
      BLOCKED_USER_STATUSES.includes(session.user.status)
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const refreshToken = this.hashing.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + this.refreshTokenTtlMs);

    const { count } = await this.prisma.deviceSession.updateMany({
      where: { id: session.id, refreshTokenHash: currentHash },
      data: {
        refreshTokenHash: this.hashing.sha256(refreshToken),
        refreshTokenExpiresAt,
        lastSeenAt: now,
      },
    });

    if (count === 0) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const accessToken = await this.tokens.signDeviceAccessToken(session.userId, session.id);
    return { ...accessToken, refreshToken, refreshTokenExpiresAt };
  }

  /** The calling watch's own settings (limits, PIN threshold, default method). */
  getCurrent(deviceSessionId: string) {
    return this.prisma.deviceSession.findUniqueOrThrow({
      where: { id: deviceSessionId },
      select: deviceSessionPublicSelect,
    });
  }

  listForUser(userId: string) {
    return this.prisma.deviceSession.findMany({
      where: { userId },
      select: deviceSessionPublicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSettings(userId: string, deviceSessionId: string, dto: UpdateDeviceSettingsDto) {
    await this.findOwnedOrThrow(userId, deviceSessionId);

    if (dto.defaultPaymentMethodId) {
      const paymentMethod = await this.prisma.paymentMethod.findFirst({
        where: { id: dto.defaultPaymentMethodId, userId, status: PaymentMethodStatus.ACTIVE },
        select: { id: true },
      });
      if (!paymentMethod) {
        throw new UnprocessableEntityException('Payment method not found or not active');
      }
    }

    return this.prisma.deviceSession.update({
      where: { id: deviceSessionId },
      data: {
        deviceName: dto.deviceName,
        maxAmountPerTransaction: dto.maxAmountPerTransaction,
        dailyLimitInCents: dto.dailyLimitInCents,
        requirePinAboveInCents: dto.requirePinAboveInCents,
        defaultPaymentMethodId: dto.defaultPaymentMethodId,
      },
      select: deviceSessionPublicSelect,
    });
  }

  /** Phone side: the owner revokes one of their watches. */
  async revoke(userId: string, deviceSessionId: string): Promise<void> {
    const revoked = await this.revokeWhere({ id: deviceSessionId, userId }, 'Revoked by user');
    if (!revoked) {
      throw new NotFoundException('Device session not found');
    }
  }

  /** Watch side: the watch unpairs itself (e.g. before changing owner). */
  async revokeOwn(deviceSessionId: string): Promise<void> {
    await this.revokeWhere({ id: deviceSessionId }, 'Unpaired from the watch');
  }

  private async revokeWhere(where: { id: string; userId?: string }, reason: string): Promise<boolean> {
    const { count } = await this.prisma.deviceSession.updateMany({
      where: { ...where, status: { not: DeviceSessionStatus.REVOKED } },
      data: {
        status: DeviceSessionStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: reason,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
    return count > 0;
  }

  private async findOwnedOrThrow(userId: string, deviceSessionId: string): Promise<void> {
    const session = await this.prisma.deviceSession.findFirst({
      where: { id: deviceSessionId, userId },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Device session not found');
    }
  }
}
