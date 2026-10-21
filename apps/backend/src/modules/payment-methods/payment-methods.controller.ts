import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { AllowPrincipals, CurrentPrincipal } from '../auth/decorators/auth.decorators';
import { AuthPrincipal, PrincipalKind } from '../auth/types/auth-principal';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Post()
  create(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(principal.userId, dto);
  }

  /** Declared before ':id' so it is never parsed as a payment method id. */
  @Get('providers/wompi')
  wompiCheckout() {
    return this.paymentMethodsService.getCheckoutConfig(PaymentProvider.WOMPI);
  }

  @AllowPrincipals(PrincipalKind.User, PrincipalKind.Device)
  @Get()
  findAll(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.paymentMethodsService.findAllForUser(principal.userId);
  }

  @AllowPrincipals(PrincipalKind.User, PrincipalKind.Device)
  @Get(':id')
  findOne(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentMethodsService.findOneForUser(principal.userId, id);
  }

  @Patch(':id/default')
  setDefault(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentMethodsService.setDefault(principal.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.paymentMethodsService.revoke(principal.userId, id);
  }
}
