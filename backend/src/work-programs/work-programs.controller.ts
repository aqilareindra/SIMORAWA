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
import { WorkProgramsService } from './work-programs.service';
import { CreateWorkProgramDto } from './dto/create-work-program.dto';
import { UpdateWorkProgramDto } from './dto/update-work-program.dto';
import { UpdateWorkProgramStatusDto } from './dto/update-work-program-status.dto';
import { QueryWorkProgramsDto } from './dto/query-work-programs.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('work-programs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkProgramsController {
  constructor(private readonly workProgramsService: WorkProgramsService) {}

  @Get()
  async findAll(@Query() query: QueryWorkProgramsDto) {
    return this.workProgramsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workProgramsService.findOne(id);
  }

  @Post()
  @Roles(Role.KADIV, Role.ADMIN)
  async create(
    @Body() createWorkProgramDto: CreateWorkProgramDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.workProgramsService.create(createWorkProgramDto, currentUserId);
  }

  @Patch(':id')
  @Roles(Role.KADIV, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateWorkProgramDto: UpdateWorkProgramDto,
  ) {
    return this.workProgramsService.update(id, updateWorkProgramDto);
  }

  @Patch(':id/status')
  @Roles(Role.KADIV, Role.PIC, Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateWorkProgramStatusDto: UpdateWorkProgramStatusDto,
  ) {
    return this.workProgramsService.updateStatus(
      id,
      updateWorkProgramStatusDto,
    );
  }

  @Delete(':id')
  @Roles(Role.KADIV, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.workProgramsService.remove(id);
  }
}
