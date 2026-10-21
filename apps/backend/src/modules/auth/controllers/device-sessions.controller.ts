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
import { SensitiveRateLimit } from '../../../common/rate-limit/rate-limit';
import { AllowPrincipals, CurrentPrincipal, Public } from '../decorators/auth.decorators';
import {
  ApprovePairingRequestDto,
  CreatePairingRequestDto,
  PollPairingRequestDto,
  RefreshDeviceTokenDto,
} from '../dto/device-pairing.dto';
import { UpdateDeviceSettingsDto } from '../dto/update-device-settings.dto';
import { DevicePairingService } from '../services/device-pairing.service';
import { DeviceSessionsService } from '../services/device-sessions.service';
import { AuthPrincipal, PrincipalKind } from '../types/auth-principal';

@Controller('devices')
export class DeviceSessionsController {
  constructor(
    private readonly deviceSessionsService: DeviceSessionsService,
    private readonly devicePairingService: DevicePairingService,
  ) {}

  /** Watch: starts pairing and receives the code to display. */
  @SensitiveRateLimit()
  @Public()
  @Post('pairing-requests')
  createPairingRequest(@Body() dto: CreatePairingRequestDto) {
    return this.devicePairingService.createRequest(dto);
  }

  /** Mobile: approves the code the user reads from the watch. */
  @SensitiveRateLimit()
  @Post('pairing-requests/approve')
  @HttpCode(HttpStatus.OK)
  approvePairingRequest(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: ApprovePairingRequestDto) {
    return this.devicePairingService.approve(principal.userId, dto);
  }

  /** Watch: polls until approved, then receives its tokens once. */
  @Public()
  @Post('pairing-requests/token')
  @HttpCode(HttpStatus.OK)
  pollPairingRequest(@Body() dto: PollPairingRequestDto) {
    return this.devicePairingService.poll(dto);
  }

  /** Watch: rotates its refresh token and gets a new access token. */
  @SensitiveRateLimit()
  @Public()
  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body() dto: RefreshDeviceTokenDto) {
    return this.deviceSessionsService.refreshDeviceToken(dto);
  }

  /** Watch: its own limits and PIN threshold. */
  @AllowPrincipals(PrincipalKind.Device)
  @Get('me')
  current(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.deviceSessionsService.getCurrent(principal.deviceSessionId!);
  }

  /** Watch: unpairs itself. Declared before ':id' so "me" is never parsed as an id. */
  @AllowPrincipals(PrincipalKind.Device)
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeCurrent(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.deviceSessionsService.revokeOwn(principal.deviceSessionId!);
  }

  @Get()
  list(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.deviceSessionsService.listForUser(principal.userId);
  }

  @Patch(':id/settings')
  updateSettings(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceSettingsDto,
  ) {
    return this.deviceSessionsService.updateSettings(principal.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.deviceSessionsService.revoke(principal.userId, id);
  }
}
