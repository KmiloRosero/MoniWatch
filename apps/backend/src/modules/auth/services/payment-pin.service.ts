import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../../config/env.validation';
import { HashingService } from '../../../infrastructure/crypto/hashing.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SetPaymentPinDto } from '../dto/set-payment-pin.dto';

const MS_PER_MINUTE = 60_000;

@Injectable()
export class PaymentPinService {
  private readonly maxAttempts: number;
  private readonly lockMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxAttempts = config.get('PAYMENT_PIN_MAX_ATTEMPTS', { infer: true });
    this.lockMinutes = config.get('PAYMENT_PIN_LOCK_MINUTES', { infer: true });
  }

  async setPin(userId: string, dto: SetPaymentPinDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!(await this.hashing.compareSecret(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        paymentPinHash: await this.hashing.hashSecret(dto.pin),
        failedPinAttempts: 0,
        pinLockedUntil: null,
      },
    });
  }

  /** Throws when the PIN is missing, wrong or locked. Locks after too many failures. */
  async verifyPin(userId: string, pin: string | undefined): Promise<void> {
    if (!pin) {
      throw new ForbiddenException('A payment PIN is required for this amount');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { paymentPinHash: true, failedPinAttempts: true, pinLockedUntil: true },
    });

    if (!user.paymentPinHash) {
      throw new ForbiddenException('Payment PIN is not configured');
    }

    const now = new Date();
    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      throw new ForbiddenException('Payment PIN is temporarily locked');
    }

    if (await this.hashing.compareSecret(pin, user.paymentPinHash)) {
      if (user.failedPinAttempts > 0 || user.pinLockedUntil) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { failedPinAttempts: 0, pinLockedUntil: null },
        });
      }
      return;
    }

    const attempts = user.failedPinAttempts + 1;
    const shouldLock = attempts >= this.maxAttempts;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedPinAttempts: shouldLock ? 0 : attempts,
        pinLockedUntil: shouldLock ? new Date(now.getTime() + this.lockMinutes * MS_PER_MINUTE) : null,
      },
    });

    throw new ForbiddenException(
      shouldLock ? 'Payment PIN is temporarily locked' : 'Invalid payment PIN',
    );
  }
}
