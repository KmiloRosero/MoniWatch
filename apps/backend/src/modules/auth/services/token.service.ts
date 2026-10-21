import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EnvironmentVariables } from '../../../config/env.validation';
import { AccessTokenPayload, AccessTokenResponse, PrincipalKind } from '../types/auth-principal';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  signUserAccessToken(userId: string, userSessionId: string): Promise<AccessTokenResponse> {
    return this.sign(
      { sub: userId, kind: PrincipalKind.User, sid: userSessionId },
      this.config.get('JWT_USER_ACCESS_TTL_SECONDS', { infer: true }),
    );
  }

  signDeviceAccessToken(userId: string, deviceSessionId: string): Promise<AccessTokenResponse> {
    return this.sign(
      { sub: userId, kind: PrincipalKind.Device, sid: deviceSessionId },
      this.config.get('JWT_DEVICE_ACCESS_TTL_SECONDS', { infer: true }),
    );
  }

  private async sign(payload: AccessTokenPayload, expiresInSeconds: number): Promise<AccessTokenResponse> {
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: expiresInSeconds });
    return { accessToken, tokenType: 'Bearer', expiresInSeconds };
  }
}
