import { plainToInstance } from 'class-transformer';
import {
  IsBase64,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export enum PaymentGatewayMode {
  Simulated = 'SIMULATED',
  Live = 'LIVE',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnvironment)
  NODE_ENV: NodeEnvironment;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @MinLength(32)
  JWT_SECRET: string;

  @IsInt()
  @Min(60)
  JWT_USER_ACCESS_TTL_SECONDS: number;

  @IsInt()
  @Min(60)
  JWT_DEVICE_ACCESS_TTL_SECONDS: number;

  @IsInt()
  @Min(1)
  USER_REFRESH_TOKEN_TTL_DAYS: number;

  @IsInt()
  @Min(1)
  DEVICE_REFRESH_TOKEN_TTL_DAYS: number;

  @IsInt()
  @Min(30)
  @Max(900)
  DEVICE_PAIRING_CODE_TTL_SECONDS: number;

  @IsInt()
  @Min(6)
  @Max(12)
  DEVICE_PAIRING_CODE_LENGTH: number;

  @IsInt()
  @Min(1)
  @Max(30)
  DEVICE_PAIRING_POLL_INTERVAL_SECONDS: number;

  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT_ROUNDS: number;

  @IsBase64()
  TOKEN_ENCRYPTION_KEY: string;

  @IsString()
  @IsNotEmpty()
  TOKEN_ENCRYPTION_KEY_ID: string;

  @IsString()
  @MinLength(32)
  TOKEN_FINGERPRINT_SECRET: string;

  @IsInt()
  @Min(1)
  PAYMENT_PIN_MAX_ATTEMPTS: number;

  @IsInt()
  @Min(1)
  PAYMENT_PIN_LOCK_MINUTES: number;

  @IsInt()
  @Min(1)
  TRANSACTION_EXPIRATION_MINUTES: number;

  @IsEnum(PaymentGatewayMode)
  PAYMENT_GATEWAY_MODE: PaymentGatewayMode;

  @IsNumber()
  @Min(0)
  @Max(1)
  PAYMENT_SIMULATOR_APPROVAL_RATE: number;

  @IsInt()
  @Min(0)
  PAYMENT_SIMULATOR_LATENCY_MS: number;

  @IsInt()
  @Min(5)
  TRANSACTION_SWEEP_INTERVAL_SECONDS: number;

  /** Secret from the Wompi dashboard used to verify event checksums. Webhooks answer 503 without it. */
  @IsOptional()
  @IsString()
  WOMPI_EVENTS_SECRET?: string;

  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS: number;

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number;

  /** Stricter limit for login, refresh, PIN and pairing endpoints (per IP, per window). */
  @IsInt()
  @Min(1)
  THROTTLE_SENSITIVE_LIMIT: number;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return validated;
}
