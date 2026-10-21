import { ArgumentsHost, Catch, ConflictException, NotFoundException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import {
  PRISMA_RECORD_NOT_FOUND,
  PRISMA_UNIQUE_VIOLATION,
} from '../../infrastructure/prisma/prisma-errors';

/**
 * Translates known Prisma errors into HTTP errors so database details
 * never leak to API clients.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    switch (exception.code) {
      case PRISMA_UNIQUE_VIOLATION:
        super.catch(new ConflictException('A record with the same unique fields already exists'), host);
        return;
      case PRISMA_RECORD_NOT_FOUND:
        super.catch(new NotFoundException('Record not found'), host);
        return;
      default:
        super.catch(exception, host);
    }
  }
}
