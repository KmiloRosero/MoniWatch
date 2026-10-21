import { IsInt, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/** Omitted fields stay unchanged; null clears a limit. */
export class UpdateDeviceSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceName?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  maxAmountPerTransaction?: number | null;

  @IsOptional()
  @IsInt()
  @IsPositive()
  dailyLimitInCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  requirePinAboveInCents?: number | null;

  @IsOptional()
  @IsUUID()
  defaultPaymentMethodId?: string | null;
}
