import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { KasService } from './kas.service';
import { CreateKasTransactionDto } from './dto/create-kas-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('kas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KasController {
  constructor(private readonly kasService: KasService) {}

  @Get()
  @Roles(Role.ADMIN, Role.BPH, Role.KADIV, Role.BENDAHARA, Role.SEKRETARIS)
  async getOverview() {
    return this.kasService.getOverview();
  }

  @Post('transactions')
  @Roles(Role.BENDAHARA, Role.ADMIN)
  async createTransaction(
    @Body() dto: CreateKasTransactionDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.kasService.createTransaction(dto, currentUserId);
  }
}
