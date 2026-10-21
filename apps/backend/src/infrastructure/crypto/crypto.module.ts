import { Global, Module } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { TokenVaultService } from './token-vault.service';

@Global()
@Module({
  providers: [HashingService, TokenVaultService],
  exports: [HashingService, TokenVaultService],
})
export class CryptoModule {}
