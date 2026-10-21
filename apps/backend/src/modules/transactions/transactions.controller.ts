import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AllowPrincipals, CurrentPrincipal } from '../auth/decorators/auth.decorators';
import { AuthPrincipal, PrincipalKind } from '../auth/types/auth-principal';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@AllowPrincipals(PrincipalKind.User, PrincipalKind.Device)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@CurrentPrincipal() principal: AuthPrincipal, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(principal, dto);
  }

  @Get()
  findAll(@CurrentPrincipal() principal: AuthPrincipal, @Query() query: ListTransactionsQueryDto) {
    return this.transactionsService.findAllForUser(principal.userId, query);
  }

  @Get(':id')
  findOne(@CurrentPrincipal() principal: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.findOneForUser(principal.userId, id);
  }
}
