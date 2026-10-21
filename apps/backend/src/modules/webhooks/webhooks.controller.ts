import { Body, Controller, HttpCode, HttpStatus, NotImplementedException, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/auth.decorators';
import { WebhooksService } from './webhooks.service';

/** Inbound provider notifications. Authenticated by signature, not by JWT. */
@Public()
@SkipThrottle()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('wompi')
  @HttpCode(HttpStatus.OK)
  wompi(@Body() body: unknown) {
    return this.webhooksService.handleWompiEvent(body);
  }

  /** Nequi notifications arrive with the live Nequi integration (PAYMENT_GATEWAY_MODE=LIVE). */
  @Post('nequi')
  nequi() {
    throw new NotImplementedException('Nequi notifications are not implemented yet');
  }
}
