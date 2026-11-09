import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { ReviewBudgetDto } from './dto/review-budget.dto';
import { QueryBudgetsDto } from './dto/query-budgets.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('budgets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @Roles(
    Role.ADMIN,
    Role.BPH,
    Role.KADIV,
    Role.BENDAHARA,
    Role.SEKRETARIS,
    Role.PIC,
  )
  async findAll(@Query() query: QueryBudgetsDto) {
    return this.budgetsService.findAll(query);
  }

  @Get(':id')
  @Roles(
    Role.ADMIN,
    Role.BPH,
    Role.KADIV,
    Role.BENDAHARA,
    Role.SEKRETARIS,
    Role.PIC,
  )
  async findOne(@Param('id') id: string) {
    return this.budgetsService.findOne(id);
  }

  @Post()
  @Roles(Role.KADIV, Role.PIC, Role.BENDAHARA, Role.ADMIN)
  async create(@Body() dto: CreateBudgetDto, @CurrentUser() user: AuthUser) {
    return this.budgetsService.create(dto, user);
  }

  @Patch(':id/submit')
  @Roles(Role.KADIV, Role.PIC, Role.BENDAHARA, Role.ADMIN)
  async submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.budgetsService.submit(id, user);
  }

  @Patch(':id/review')
  @Roles(Role.BENDAHARA, Role.BPH, Role.ADMIN)
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewBudgetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.budgetsService.review(id, dto, user);
  }

  @Patch(':id')
  @Roles(Role.KADIV, Role.PIC, Role.BENDAHARA, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.budgetsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.KADIV, Role.PIC, Role.BENDAHARA, Role.ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.budgetsService.remove(id, user);
  }
}
