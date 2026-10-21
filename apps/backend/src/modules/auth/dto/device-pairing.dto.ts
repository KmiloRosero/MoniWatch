import { DevicePlatform } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Sent by the watch (unauthenticated) to start pairing. */
export class CreatePairingRequestDto {
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  deviceId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  osVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  devicePublicKey?: string;
}

/** Sent by the mobile app (authenticated user) with the code shown on the watch. */
export class ApprovePairingRequestDto {
  @Matches(/^[A-Za-z0-9\s-]{4,24}$/, { message: 'userCode has an invalid format' })
  userCode: string;
}

/** Sent by the watch while it waits for the user to approve the code. */
export class PollPairingRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  deviceCode: string;
}

export class RefreshDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  refreshToken: string;
}
