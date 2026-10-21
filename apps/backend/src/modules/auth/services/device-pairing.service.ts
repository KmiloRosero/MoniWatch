import {
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevicePairingRequest, DevicePairingStatus, DeviceSessionStatus } from '@prisma/client';
import { EnvironmentVariables } from '../../../config/env.validation';
import { HashingService } from '../../../infrastructure/crypto/hashing.service';
import { isUniqueViolation } from '../../../infrastructure/prisma/prisma-errors';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  ApprovePairingRequestDto,
  CreatePairingRequestDto,
  PollPairingRequestDto,
} from '../dto/device-pairing.dto';
import { AccessTokenResponse } from '../types/auth-principal';
import { TokenService } from './token.service';

/** Consonants only (RFC 8628 §6.1): no vowels to avoid words, no 0/O or 1/I confusion. */
const USER_CODE_ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ';
const MAX_CODE_GENERATION_ATTEMPTS = 3;
/** A poll earlier than half the advertised interval is treated as abuse. */
const MIN_POLL_INTERVAL_FRACTION = 0.5;
const MS_PER_SECOND = 1_000;
const MS_PER_DAY = 86_400_000;

export type PairingPollResult =
  | { status: 'PENDING'; expiresAt: Date; pollIntervalSeconds: number }
  | ({
      status: 'APPROVED';
      refreshToken: string;
      refreshTokenExpiresAt: Date;
      deviceSessionId: string;
    } & AccessTokenResponse);

/**
 * Device authorization flow for the watch (input-constrained device):
 * the watch shows a short code, the user approves it from the phone,
 * and the watch collects its tokens exactly once with a secret device code.
 */
@Injectable()
export class DevicePairingService {
  private readonly requestTtlMs: number;
  private readonly userCodeLength: number;
  private readonly pollIntervalSeconds: number;
  private readonly refreshTokenTtlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.requestTtlMs = config.get('DEVICE_PAIRING_CODE_TTL_SECONDS', { infer: true }) * MS_PER_SECOND;
    this.userCodeLength = config.get('DEVICE_PAIRING_CODE_LENGTH', { infer: true });
    this.pollIntervalSeconds = config.get('DEVICE_PAIRING_POLL_INTERVAL_SECONDS', { infer: true });
    this.refreshTokenTtlMs = config.get('DEVICE_REFRESH_TOKEN_TTL_DAYS', { infer: true }) * MS_PER_DAY;
  }

  async createRequest(dto: CreatePairingRequestDto) {
    const deviceCode = this.hashing.generateOpaqueToken();
    const expiresAt = new Date(Date.now() + this.requestTtlMs);

    for (let attempt = 1; ; attempt++) {
      const userCode = this.hashing.generateCode(this.userCodeLength, USER_CODE_ALPHABET);
      try {
        await this.prisma.devicePairingRequest.create({
          data: {
            userCodeHash: this.hashing.sha256(userCode),
            deviceCodeHash: this.hashing.sha256(deviceCode),
            platform: dto.platform,
            deviceId: dto.deviceId,
            deviceName: dto.deviceName,
            deviceModel: dto.deviceModel,
            osVersion: dto.osVersion,
            appVersion: dto.appVersion,
            devicePublicKey: dto.devicePublicKey,
            expiresAt,
          },
        });
        return { userCode, deviceCode, expiresAt, pollIntervalSeconds: this.pollIntervalSeconds };
      } catch (error) {
        // Astronomically rare user code collision: draw a new one.
        if (!isUniqueViolation(error) || attempt >= MAX_CODE_GENERATION_ATTEMPTS) throw error;
      }
    }
  }

  async approve(userId: string, dto: ApprovePairingRequestDto) {
    const userCodeHash = this.hashing.sha256(normalizeUserCode(dto.userCode));
    const now = new Date();

    const { count } = await this.prisma.devicePairingRequest.updateMany({
      where: { userCodeHash, status: DevicePairingStatus.PENDING, expiresAt: { gt: now } },
      data: { status: DevicePairingStatus.APPROVED, userId, approvedAt: now },
    });

    if (count === 0) {
      throw new NotFoundException('Invalid or expired pairing code');
    }

    return this.prisma.devicePairingRequest.findUniqueOrThrow({
      where: { userCodeHash },
      select: { platform: true, deviceName: true, deviceModel: true, approvedAt: true },
    });
  }

  async poll(dto: PollPairingRequestDto): Promise<PairingPollResult> {
    const request = await this.prisma.devicePairingRequest.findUnique({
      where: { deviceCodeHash: this.hashing.sha256(dto.deviceCode) },
    });

    if (!request) {
      throw new UnauthorizedException('Invalid device code');
    }

    const now = new Date();

    if (request.status === DevicePairingStatus.CONSUMED || request.status === DevicePairingStatus.EXPIRED) {
      throw new GoneException('Pairing request is no longer valid');
    }

    if (request.status === DevicePairingStatus.APPROVED) {
      return this.issueDeviceSession(request, now);
    }

    if (request.expiresAt <= now) {
      await this.prisma.devicePairingRequest.update({
        where: { id: request.id },
        data: { status: DevicePairingStatus.EXPIRED },
      });
      throw new GoneException('Pairing request expired');
    }

    const minPollGapMs = this.pollIntervalSeconds * MS_PER_SECOND * MIN_POLL_INTERVAL_FRACTION;
    if (request.lastPolledAt && now.getTime() - request.lastPolledAt.getTime() < minPollGapMs) {
      throw new HttpException('Polling too frequently', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.prisma.devicePairingRequest.update({
      where: { id: request.id },
      data: { lastPolledAt: now },
    });

    return { status: 'PENDING', expiresAt: request.expiresAt, pollIntervalSeconds: this.pollIntervalSeconds };
  }

  private async issueDeviceSession(request: DevicePairingRequest, now: Date): Promise<PairingPollResult> {
    const userId = request.userId;
    if (!userId) {
      throw new GoneException('Pairing request is no longer valid');
    }

    const refreshToken = this.hashing.generateOpaqueToken();
    const refreshTokenExpiresAt = new Date(now.getTime() + this.refreshTokenTtlMs);

    const session = await this.prisma.$transaction(async (tx) => {
      // Conditional update: tokens can be collected exactly once.
      const { count } = await tx.devicePairingRequest.updateMany({
        where: { id: request.id, status: DevicePairingStatus.APPROVED },
        data: { status: DevicePairingStatus.CONSUMED, consumedAt: now },
      });
      if (count === 0) {
        throw new GoneException('Pairing request is no longer valid');
      }

      // Re-pairing the same watch keeps its spending limits but rotates every credential.
      const deviceState = {
        platform: request.platform,
        status: DeviceSessionStatus.ACTIVE,
        deviceName: request.deviceName,
        deviceModel: request.deviceModel,
        osVersion: request.osVersion,
        appVersion: request.appVersion,
        devicePublicKey: request.devicePublicKey,
        pairedAt: now,
        lastSeenAt: now,
        refreshTokenHash: this.hashing.sha256(refreshToken),
        refreshTokenExpiresAt,
        revokedAt: null,
        revokedReason: null,
      };

      const deviceSession = await tx.deviceSession.upsert({
        where: { userId_deviceId: { userId, deviceId: request.deviceId } },
        create: { ...deviceState, userId, deviceId: request.deviceId },
        update: deviceState,
        select: { id: true },
      });

      await tx.devicePairingRequest.update({
        where: { id: request.id },
        data: { deviceSessionId: deviceSession.id },
      });

      return deviceSession;
    });

    const accessToken = await this.tokens.signDeviceAccessToken(userId, session.id);
    return { status: 'APPROVED', ...accessToken, refreshToken, refreshTokenExpiresAt, deviceSessionId: session.id };
  }
}

/** "bcdf-ghjk" and "BCDF GHJK" both become "BCDFGHJK". */
function normalizeUserCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
