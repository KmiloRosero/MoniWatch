import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { EnvironmentVariables } from '../../config/env.validation';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 12;

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
}

/**
 * Encrypts provider tokens at rest with AES-256-GCM.
 * The key id is persisted with every record so keys can be rotated later.
 */
@Injectable()
export class TokenVaultService {
  private readonly key: Buffer;
  private readonly keyId: string;
  private readonly fingerprintSecret: string;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    const encodedKey: string = config.get('TOKEN_ENCRYPTION_KEY', { infer: true });
    this.key = Buffer.from(encodedKey, 'base64');
    this.keyId = config.get('TOKEN_ENCRYPTION_KEY_ID', { infer: true });
    this.fingerprintSecret = config.get('TOKEN_FINGERPRINT_SECRET', { infer: true });

    if (this.key.length !== KEY_LENGTH_BYTES) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must decode to exactly ${KEY_LENGTH_BYTES} bytes`);
    }
  }

  encrypt(plaintext: string): EncryptedSecret {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv(CIPHER_ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyId: this.keyId,
    };
  }

  decrypt(secret: EncryptedSecret): string {
    if (secret.keyId !== this.keyId) {
      throw new Error(`No encryption key available for key id "${secret.keyId}"`);
    }

    const decipher = createDecipheriv(CIPHER_ALGORITHM, this.key, Buffer.from(secret.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(secret.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  /** Deterministic HMAC used to detect duplicate tokens without decrypting them. */
  fingerprint(value: string): string {
    return createHmac('sha256', this.fingerprintSecret).update(value).digest('hex');
  }
}
