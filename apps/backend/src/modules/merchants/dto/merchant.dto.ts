import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterMerchantDto {
  /** Name payers see on the watch. Defaults to the business name registered at Wompi. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(40)
  category?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  wompiPublicKey: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  wompiPrivateKey: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  wompiIntegritySecret: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  wompiEventsSecret: string;
}

export class SearchMerchantsQueryDto {
  /** Part of the name or the exact merchant code. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(60)
  search?: string;
}

export class SaveMerchantDto {
  @IsUUID()
  merchantId: string;
}
