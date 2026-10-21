import { copy } from '@/i18n/es';
import type { DeviceSession } from '@/services/api/types';
import { formatDateTime, formatMinorUnits } from '@/utils/format';

const t = copy.devices;

export function watchName(watch: DeviceSession): string {
  return watch.deviceName ?? watch.deviceModel ?? t.genericName;
}

export function watchSummary(watch: DeviceSession): string {
  const limits =
    watch.maxAmountPerTransaction !== null ? t.limitsSummary(formatMinorUnits(watch.maxAmountPerTransaction)) : t.noLimits;
  const lastSeen = watch.lastSeenAt ? ` · ${t.lastSeen(formatDateTime(watch.lastSeenAt))}` : '';
  return `${t.platforms[watch.platform]} · ${limits}${lastSeen}`;
}
