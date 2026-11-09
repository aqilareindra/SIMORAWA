import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Role } from '@prisma/client';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get(['finance/export/excel', 'budgets/export/excel'])
  @Roles(
    Role.BENDAHARA,
    Role.BPH,
    Role.ADMIN,
    Role.SEKRETARIS,
    Role.KADIV,
  )
  async exportFinanceExcel(@Res() res: Response) {
    const buffer = await this.exportsService.generateFinanceExcel();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Rekap-Keuangan-Kas-HIMA-${dateStamp}.xlsx`;

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('evaluations/export/pdf')
  @Roles(Role.ADMIN, Role.BPH, Role.KADIV, Role.SEKRETARIS)
  async exportEvaluationsPdf(@Res() res: Response) {
    const buffer = await this.exportsService.generateEvaluationsPdf();
    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `Laporan-Evaluasi-KPI-KPA-HIMA-${dateStamp}.pdf`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
