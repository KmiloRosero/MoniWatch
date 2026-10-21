import { DocumentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { DOCUMENT_NUMBER_PATTERN, E164_PHONE_PATTERN } from '../../../common/validation/patterns';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @Matches(E164_PHONE_PATTERN, { message: 'phoneNumber must be in E.164 format (e.g. +573001234567)' })
  phoneNumber: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @Transform(trim)
  @Matches(DOCUMENT_NUMBER_PATTERN, { message: 'documentNumber must be 4-20 alphanumeric characters' })
  documentNumber: string;
}
