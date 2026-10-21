import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Headers, Post, Put } from '@nestjs/common';
import { SensitiveRateLimit } from '../../../common/rate-limit/rate-limit';
import { AllowPrincipals, CurrentPrincipal, Public } from '../decorators/auth.decorators';
import { LoginDto } from '../dto/login.dto';
import { RefreshSessionDto } from '../dto/refresh-session.dto';
import { RegisterDto } from '../dto/register.dto';
import { SetPaymentPinDto } from '../dto/set-payment-pin.dto';
import { AuthService } from '../services/auth.service';
import { PaymentPinService } from '../services/payment-pin.service';
import { AuthPrincipal, PrincipalKind } from '../types/auth-principal';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly paymentPinService: PaymentPinService,
  ) {}

  @Public()
  @SensitiveRateLimit()
  @Post('register')
  register(@Body() dto: RegisterDto, @Ip() ipAddress: string, @Headers('user-agent') userAgent?: string) {
    return this.authService.register(dto, { ipAddress, userAgent });
  }

  @Public()
  @SensitiveRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Ip() ipAddress: string, @Headers('user-agent') userAgent?: string) {
    return this.authService.login(dto, { ipAddress, userAgent });
  }

  @Public()
  @SensitiveRateLimit()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshSessionDto) {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.authService.logout(principal.userSessionId!);
  }

  @AllowPrincipals(PrincipalKind.User, PrincipalKind.Device)
  @Get('me')
  me(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.authService.getProfile(principal.userId);
  }

  @SensitiveRateLimit()
  @Put('payment-pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  setPaymentPin(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: SetPaymentPinDto) {
    return this.paymentPinService.setPin(principal.userId, dto);
  }
}
