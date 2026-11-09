import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EvaluationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateEvaluationDto } from './dto/update-evaluation.dto';
import { QueryEvaluationsDto } from './dto/query-evaluations.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

const EVALUATION_INCLUDE = {
  workProgram: {
    include: {
      pic: {
        select: USER_PUBLIC_SELECT,
      },
    },
  },
  evaluator: {
    select: USER_PUBLIC_SELECT,
  },
  indicators: true,
} satisfies Prisma.EvaluationInclude;

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private withAverageScore<
    T extends { indicators: Array<{ score: number }> },
  >(evaluation: T): T & { avgScore: number } {
    const indicators = evaluation.indicators || [];
    if (indicators.length === 0) {
      return { ...evaluation, avgScore: 0 };
    }
    const sum = indicators.reduce((acc, item) => acc + Number(item.score), 0);
    const avgScore = Number((sum / indicators.length).toFixed(2));
    return {
      ...evaluation,
      avgScore,
    };
  }

  async getSummary() {
    const evaluations = await this.prisma.evaluation.findMany({
      include: {
        indicators: true,
      },
    });

    const totalEvaluations = evaluations.length;
    const submittedEvaluations = evaluations.filter(
      (e) => e.status === EvaluationStatus.SUBMITTED,
    );
    const submittedCount = submittedEvaluations.length;
    const draftCount = evaluations.filter(
      (e) => e.status === EvaluationStatus.DRAFT,
    ).length;

    const poolForAverage =
      submittedEvaluations.length > 0 ? submittedEvaluations : evaluations;

    const allIndicators = poolForAverage.flatMap((e) => e.indicators || []);
    const averageScore =
      allIndicators.length > 0
        ? Number(
            (
              allIndicators.reduce((acc, ind) => acc + Number(ind.score), 0) /
              allIndicators.length
            ).toFixed(2),
          )
        : 0;

    return {
      totalEvaluations,
      submittedCount,
      draftCount,
      averageScore,
    };
  }

  async findAll(query: QueryEvaluationsDto) {
    const where: Prisma.EvaluationWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.workProgramId && query.workProgramId.trim() !== '') {
      where.workProgramId = query.workProgramId.trim();
    }

    if (query.search && query.search.trim() !== '') {
      const keyword = query.search.trim();
      where.OR = [
        {
          workProgram: {
            name: {
              contains: keyword,
            },
          },
        },
        {
          kesimpulan: {
            contains: keyword,
          },
        },
      ];
    }

    const evaluations = await this.prisma.evaluation.findMany({
      where,
      include: EVALUATION_INCLUDE,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return evaluations.map((e) => this.withAverageScore(e));
  }

  async findOne(id: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: EVALUATION_INCLUDE,
    });

    if (!evaluation) {
      throw new NotFoundException('Data evaluasi tidak ditemukan.');
    }

    return this.withAverageScore(evaluation);
  }

  async create(dto: CreateEvaluationDto, currentUserId: string) {
    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id: dto.workProgramId },
    });

    if (!workProgram) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    const status = dto.status ?? EvaluationStatus.DRAFT;
    const kesimpulan = dto.kesimpulan?.trim() || null;
    const rekomendasi = dto.rekomendasi?.trim() || null;

    if (status === EvaluationStatus.SUBMITTED) {
      if (!kesimpulan || !rekomendasi) {
        throw new BadRequestException(
          'Kesimpulan dan Rekomendasi wajib diisi saat mengirim evaluasi berstatus SUBMITTED.',
        );
      }
    }

    const evaluatedBy =
      dto.evaluatedBy && dto.evaluatedBy.trim() !== ''
        ? dto.evaluatedBy.trim()
        : currentUserId;

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.evaluation.create({
        data: {
          workProgramId: dto.workProgramId,
          evaluatedBy,
          status,
          kesimpulan,
          rekomendasi,
          indicators: {
            create: dto.indicators.map((ind) => ({
              indicatorName: ind.indicatorName.trim(),
              target: ind.target.trim(),
              realisasi: ind.realisasi.trim(),
              score: Number(ind.score),
              notes: ind.notes?.trim() ? ind.notes.trim() : null,
            })),
          },
        },
        include: EVALUATION_INCLUDE,
      });
    });

    const result = this.withAverageScore(created);

    if (status === EvaluationStatus.SUBMITTED && created.workProgram) {
      await this.notificationsService.createNotification({
        userId: created.workProgram.picId,
        type: 'EVALUATION_SUBMITTED',
        title: `Hasil Evaluasi KPI/KPA: ${created.workProgram.name}`,
        message: `Evaluasi KPI/KPA untuk program kerja "${created.workProgram.name}" telah disubmit dengan rata-rata skor ${result.avgScore} / 5.`,
        link: `/work-programs/${created.workProgramId}?tab=evaluations`,
      });
    }

    return result;
  }

  async update(id: string, dto: UpdateEvaluationDto) {
    const existing = await this.prisma.evaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data evaluasi tidak ditemukan.');
    }

    const nextStatus = dto.status ?? existing.status;
    const nextKesimpulan =
      dto.kesimpulan !== undefined
        ? dto.kesimpulan.trim() || null
        : existing.kesimpulan;
    const nextRekomendasi =
      dto.rekomendasi !== undefined
        ? dto.rekomendasi.trim() || null
        : existing.rekomendasi;

    if (nextStatus === EvaluationStatus.SUBMITTED) {
      if (!nextKesimpulan || !nextRekomendasi) {
        throw new BadRequestException(
          'Kesimpulan dan Rekomendasi wajib diisi saat mengirim evaluasi berstatus SUBMITTED.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.indicators && dto.indicators.length > 0) {
        await tx.evaluationIndicator.deleteMany({
          where: { evaluationId: id },
        });
      }

      return tx.evaluation.update({
        where: { id },
        data: {
          workProgramId: dto.workProgramId ?? undefined,
          evaluatedBy: dto.evaluatedBy ?? undefined,
          status: nextStatus,
          kesimpulan: nextKesimpulan,
          rekomendasi: nextRekomendasi,
          ...(dto.indicators && dto.indicators.length > 0
            ? {
                indicators: {
                  create: dto.indicators.map((ind) => ({
                    indicatorName: ind.indicatorName.trim(),
                    target: ind.target.trim(),
                    realisasi: ind.realisasi.trim(),
                    score: Number(ind.score),
                    notes: ind.notes?.trim() ? ind.notes.trim() : null,
                  })),
                },
              }
            : {}),
        },
        include: EVALUATION_INCLUDE,
      });
    });

    const result = this.withAverageScore(updated);

    if (
      nextStatus === EvaluationStatus.SUBMITTED &&
      existing.status !== EvaluationStatus.SUBMITTED &&
      updated.workProgram
    ) {
      await this.notificationsService.createNotification({
        userId: updated.workProgram.picId,
        type: 'EVALUATION_SUBMITTED',
        title: `Hasil Evaluasi KPI/KPA: ${updated.workProgram.name}`,
        message: `Evaluasi KPI/KPA untuk program kerja "${updated.workProgram.name}" telah disubmit dengan rata-rata skor ${result.avgScore} / 5.`,
        link: `/work-programs/${updated.workProgramId}?tab=evaluations`,
      });
    }

    return result;
  }

  async remove(id: string) {
    const existing = await this.prisma.evaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Data evaluasi tidak ditemukan.');
    }

    await this.prisma.evaluation.delete({
      where: { id },
    });

    return {
      message: 'Data evaluasi berhasil dihapus.',
      deletedId: id,
    };
  }
}
