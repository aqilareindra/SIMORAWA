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
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.BPH, Role.KADIV, Role.SEKRETARIS)
  async getSummary() {
    return this.evaluationsService.getSummary();
  }

  @Get()
  @Roles(Role.ADMIN, Role.BPH, Role.KADIV, Role.SEKRETARIS)
  async findAll(@Query() query: QueryEvaluationsDto) {
    return this.evaluationsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.evaluationsService.findOne(id);
  }

  @Post()
  @Roles(Role.KADIV, Role.BPH, Role.ADMIN)
  async create(
    @Body() createEvaluationDto: CreateEvaluationDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.evaluationsService.create(createEvaluationDto, currentUserId);
  }

  @Patch(':id')
  @Roles(Role.KADIV, Role.BPH, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateEvaluationDto: UpdateEvaluationDto,
  ) {
    return this.evaluationsService.update(id, updateEvaluationDto);
  }

  @Delete(':id')
  @Roles(Role.KADIV, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.evaluationsService.remove(id);
  }
}
