import { ExecutionContext, SetMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { EnvironmentVariables } from '../../config/env.validation';

const SENSITIVE_RATE_LIMIT_KEY = 'rate-limit:sensitive';
const MS_PER_SECOND = 1_000;

/** Applies the stricter THROTTLE_SENSITIVE_LIMIT (login, refresh, PIN, pairing). */
export const SensitiveRateLimit = () => SetMetadata(SENSITIVE_RATE_LIMIT_KEY, true);

function isSensitive(context: ExecutionContext): boolean {
  return [context.getHandler(), context.getClass()].some(
    (target) => Reflect.getMetadata(SENSITIVE_RATE_LIMIT_KEY, target) === true,
  );
}

/** One throttler whose limit depends on the route, so limits stay configurable at runtime. */
export function throttlerOptionsFactory(config: ConfigService<EnvironmentVariables, true>): ThrottlerModuleOptions {
  const defaultLimit = config.get('THROTTLE_LIMIT', { infer: true });
  const sensitiveLimit = config.get('THROTTLE_SENSITIVE_LIMIT', { infer: true });

  return {
    throttlers: [
      {
        ttl: config.get('THROTTLE_TTL_SECONDS', { infer: true }) * MS_PER_SECOND,
        limit: (context: ExecutionContext) => (isSensitive(context) ? sensitiveLimit : defaultLimit),
      },
    ],
  };
}
