import { PaymentMethodType, PaymentProvider } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { E164_PHONE_PATTERN } from '../../../common/validation/patterns';

const isCard = (dto: CreatePaymentMethodDto) => dto.type === PaymentMethodType.CARD;

export class CreatePaymentMethodDto {
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @IsEnum(PaymentMethodType)
  type: PaymentMethodType;

  /** Token issued by the provider SDK (e.g. Wompi card token, Nequi subscription token). Never a raw card number. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  providerToken: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  alias?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** Wallet phone number. Defaults to the user's phone number when omitted. */
  @IsOptional()
  @Matches(E164_PHONE_PATTERN, { message: 'walletPhoneNumber must be in E.164 format' })
  walletPhoneNumber?: string;

  @ValidateIf(isCard)
  @Matches(/^\d{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4?: string;

  @ValidateIf(isCard)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  cardBrand?: string;

  @ValidateIf(isCard)
  @IsInt()
  @Min(1)
  @Max(12)
  cardExpMonth?: number;

  @ValidateIf(isCard)
  @IsInt()
  @Min(2000)
  @Max(2100)
  cardExpYear?: number;
}
