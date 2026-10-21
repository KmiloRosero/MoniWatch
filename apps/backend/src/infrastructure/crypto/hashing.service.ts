import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class HashingService {
  private readonly saltRounds: number;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.saltRounds = config.get('BCRYPT_SALT_ROUNDS', { infer: true });
  }

  /** Slow hash for low-entropy secrets (passwords, PINs). */
  hashSecret(plain: string): Promise<string> {
    return hash(plain, this.saltRounds);
  }

  compareSecret(plain: string, secretHash: string): Promise<boolean> {
    return compare(plain, secretHash);
  }

  /** Fast hash for high-entropy or short-lived values (refresh tokens, pairing codes). */
  sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  safeEqualHex(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
  }

  generateOpaqueToken(byteLength = 48): string {
    return randomBytes(byteLength).toString('base64url');
  }

  /** Cryptographically random code drawn from the given alphabet. */
  generateCode(length: number, alphabet: string): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += alphabet.charAt(randomInt(0, alphabet.length));
    }
    return code;
  }
}
