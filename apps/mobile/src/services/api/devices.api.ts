import { apiRequest } from './http-client';
import type { ApprovedPairing, DeviceSession, UpdateDeviceSettingsRequest } from './types';

export const devicesApi = {
  list() {
    return apiRequest<DeviceSession[]>('/devices');
  },

  /** Approves the code shown on the watch screen. */
  approvePairing(userCode: string) {
    return apiRequest<ApprovedPairing>('/devices/pairing-requests/approve', {
      method: 'POST',
      body: { userCode },
    });
  },

  updateSettings(id: string, body: UpdateDeviceSettingsRequest) {
    return apiRequest<DeviceSession>(`/devices/${encodeURIComponent(id)}/settings`, { method: 'PATCH', body });
  },

  revoke(id: string) {
    return apiRequest<void>(`/devices/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
