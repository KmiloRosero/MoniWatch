import { Currency } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PAYMENT_PIN_PATTERN } from '../../../common/validation/patterns';

export class CreateTransactionDto {
  /** Client-generated UUID. Retrying with the same key never charges twice. */
  @IsUUID()
  idempotencyKey: string;

  /** Falls back to the watch default, then to the user default payment method. */
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @IsInt()
  @IsPositive()
  amountInCents: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  description?: string;

  /** Required from the watch when the amount exceeds the device PIN threshold. */
  @IsOptional()
  @Matches(PAYMENT_PIN_PATTERN, { message: 'paymentPin must be 4 to 6 digits' })
  paymentPin?: string;
}
