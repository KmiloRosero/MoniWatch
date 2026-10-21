import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../config/env.validation';
import { AuthController } from './controllers/auth.controller';
import { DeviceSessionsController } from './controllers/device-sessions.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthService } from './services/auth.service';
import { DevicePairingService } from './services/device-pairing.service';
import { DeviceSessionsService } from './services/device-sessions.service';
import { PaymentPinService } from './services/payment-pin.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController, DeviceSessionsController],
  providers: [
    AuthService,
    DevicePairingService,
    DeviceSessionsService,
    PaymentPinService,
    TokenService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
  ],
  exports: [PaymentPinService],
})
export class AuthModule {}
