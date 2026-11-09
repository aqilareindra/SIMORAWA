import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ProgressReportsService } from './progress-reports.service';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressReportsController {
  constructor(
    private readonly progressReportsService: ProgressReportsService,
  ) {}

  @Get('work-programs/:workProgramId/progress')
  async findByWorkProgram(@Param('workProgramId') workProgramId: string) {
    return this.progressReportsService.findByWorkProgram(workProgramId);
  }

  @Post('work-programs/:workProgramId/progress')
  @Roles(Role.PIC, Role.KADIV, Role.ADMIN)
  async create(
    @Param('workProgramId') workProgramId: string,
    @Body() createProgressReportDto: CreateProgressReportDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.progressReportsService.create(
      workProgramId,
      createProgressReportDto,
      currentUserId,
    );
  }

  @Delete('progress-reports/:id')
  @Roles(Role.PIC, Role.KADIV, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.progressReportsService.remove(id);
  }
}
