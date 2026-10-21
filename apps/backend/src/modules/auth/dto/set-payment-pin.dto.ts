import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PAYMENT_PIN_PATTERN } from '../../../common/validation/patterns';

export class SetPaymentPinDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword: string;

  @Matches(PAYMENT_PIN_PATTERN, { message: 'pin must be 4 to 6 digits' })
  pin: string;
}
