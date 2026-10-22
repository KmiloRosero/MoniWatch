import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SensitiveRateLimit } from '../../common/rate-limit/rate-limit';
import { AllowPrincipals, CurrentPrincipal } from '../auth/decorators/auth.decorators';
import { AuthPrincipal, PrincipalKind } from '../auth/types/auth-principal';
import { RegisterMerchantDto, SaveMerchantDto, SearchMerchantsQueryDto } from './dto/merchant.dto';
import { MerchantsService } from './merchants.service';

/** Literal routes are declared before ':id' so they are never parsed as merchant ids. */
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  search(@Query() query: SearchMerchantsQueryDto) {
    return this.merchantsService.search(query.search);
  }

  /** Registering a merchant checks its keys against Wompi, so it is rate limited like a login. */
  @SensitiveRateLimit()
  @Post()
  register(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: RegisterMerchantDto) {
    return this.merchantsService.register(principal.userId, dto);
  }

  @Get('mine')
  listOwned(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.merchantsService.listOwned(principal.userId);
  }

  @AllowPrincipals(PrincipalKind.User, PrincipalKind.Device)
  @Get('saved')
  listSaved(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.merchantsService.listSaved(principal.userId);
  }

  @Post('saved')
  save(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: SaveMerchantDto) {
    return this.merchantsService.save(principal.userId, dto.merchantId);
  }

  @Delete('saved/:merchantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsave(@CurrentPrincipal() principal: AuthPrincipal, @Param('merchantId', ParseUUIDPipe) merchantId: string) {
    return this.merchantsService.unsave(principal.userId, merchantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchantsService.findPublic(id);
  }

  @Get(':id/checkout/wompi')
  wompiCheckout(@Param('id', ParseUUIDPipe) id: string) {
    return this.merchantsService.getWompiCheckout(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.merchantsService.deactivate(principal.userId, id);
  }
}
