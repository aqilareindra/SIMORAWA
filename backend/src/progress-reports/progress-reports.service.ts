import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkProgramStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgressReportDto } from './dto/create-progress-report.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class ProgressReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkProgram(workProgramId: string) {
    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id: workProgramId },
    });

    if (!workProgram) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    return this.prisma.progressReport.findMany({
      where: { workProgramId },
      include: {
        submitter: {
          select: USER_PUBLIC_SELECT,
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });
  }

  async create(
    workProgramId: string,
    dto: CreateProgressReportDto,
    currentUserId: string,
  ) {
    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id: workProgramId },
    });

    if (!workProgram) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    return this.prisma.$transaction(async (tx) => {
      const progressReport = await tx.progressReport.create({
        data: {
          workProgramId,
          submittedBy: currentUserId,
          progressPct: dto.progressPct,
          description: dto.description.trim(),
          obstacles: dto.obstacles?.trim() ? dto.obstacles.trim() : null,
        },
        include: {
          submitter: {
            select: USER_PUBLIC_SELECT,
          },
        },
      });

      // Otomatisasi Status Proker (FR-22)
      if (
        dto.progressPct === 100 &&
        workProgram.status !== WorkProgramStatus.COMPLETED
      ) {
        await tx.workProgram.update({
          where: { id: workProgramId },
          data: { status: WorkProgramStatus.COMPLETED },
        });
      } else if (
        dto.progressPct > 0 &&
        dto.progressPct < 100 &&
        workProgram.status === WorkProgramStatus.NOT_STARTED
      ) {
        await tx.workProgram.update({
          where: { id: workProgramId },
          data: { status: WorkProgramStatus.IN_PROGRESS },
        });
      }

      return progressReport;
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.progressReport.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Laporan progres tidak ditemukan.');
    }

    await this.prisma.progressReport.delete({
      where: { id },
    });

    return {
      message: 'Laporan progres berhasil dihapus.',
      deletedId: id,
    };
  }
}
