import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'smartwatch-pay.device-id';

export interface DeviceIdentity {
  deviceId: string;
  deviceName?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

/**
 * Stable per-install identifier. A random UUID (not a hardware ID) so it cannot
 * be used to track the user across apps; reinstalling simply pairs a "new" watch.
 */
async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  return {
    deviceId: await getOrCreateDeviceId(),
    deviceName: Device.deviceName ?? undefined,
    deviceModel: Device.modelName ?? undefined,
    osVersion: Device.osVersion ?? undefined,
    appVersion: Application.nativeApplicationVersion ?? undefined,
  };
}
