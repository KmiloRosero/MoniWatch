import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/services/api/devices.api';
import { queryKeys } from '@/services/api/query-keys';
import type { UpdateDeviceSettingsRequest } from '@/services/api/types';

/** Paired watches only: revoked and expired sessions are history, not devices. */
export function useWatches() {
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: devicesApi.list,
    select: (devices) => devices.filter((device) => device.status === 'ACTIVE'),
  });
}

export function useApproveWatchPairing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: devicesApi.approvePairing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices }),
  });
}

export function useUpdateWatchSettings(deviceSessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateDeviceSettingsRequest) => devicesApi.updateSettings(deviceSessionId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices }),
  });
}

export function useRevokeWatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: devicesApi.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.devices }),
  });
}
