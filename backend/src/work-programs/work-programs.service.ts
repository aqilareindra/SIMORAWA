import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetStatus, Prisma, WorkProgramStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateWorkProgramDto } from './dto/create-work-program.dto';
import { UpdateWorkProgramDto } from './dto/update-work-program.dto';
import { UpdateWorkProgramStatusDto } from './dto/update-work-program-status.dto';
import { QueryWorkProgramsDto } from './dto/query-work-programs.dto';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class WorkProgramsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(query: QueryWorkProgramsDto) {
    const where: Prisma.WorkProgramWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.picId && query.picId.trim() !== '') {
      where.picId = query.picId.trim();
    }

    if (query.search && query.search.trim() !== '') {
      const keyword = query.search.trim();
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    return this.prisma.workProgram.findMany({
      where,
      include: {
        pic: {
          select: USER_PUBLIC_SELECT,
        },
        budgets: {
          include: {
            items: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            documents: true,
            progressReports: true,
            budgets: true,
            evaluations: true,
          },
        },
      },
      orderBy: {
        deadline: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id },
      include: {
        pic: {
          select: USER_PUBLIC_SELECT,
        },
        budgets: {
          include: {
            items: true,
            submitter: {
              select: USER_PUBLIC_SELECT,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        progressReports: {
          include: {
            submitter: {
              select: USER_PUBLIC_SELECT,
            },
          },
          orderBy: {
            submittedAt: 'desc',
          },
        },
        documents: {
          include: {
            uploader: {
              select: USER_PUBLIC_SELECT,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        evaluations: {
          include: {
            evaluator: {
              select: USER_PUBLIC_SELECT,
            },
            indicators: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            documents: true,
            progressReports: true,
            budgets: true,
            evaluations: true,
          },
        },
      },
    });

    if (!workProgram) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    return workProgram;
  }

  async create(dto: CreateWorkProgramDto, currentUserId: string) {
    const picUser = await this.prisma.user.findUnique({
      where: { id: dto.picId },
    });

    if (!picUser || !picUser.isActive) {
      throw new BadRequestException(
        'PIC yang dipilih tidak ditemukan atau berstatus nonaktif.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const createdProgram = await tx.workProgram.create({
        data: {
          name: dto.name.trim(),
          description: dto.description.trim(),
          picId: dto.picId,
          deadline: new Date(dto.deadline),
          status: dto.status ?? WorkProgramStatus.NOT_STARTED,
        },
      });

      const validItems = (dto.initialBudgetItems ?? []).filter(
        (item) => item.itemName && item.itemName.trim() !== '',
      );

      if (validItems.length > 0) {
        const mappedItems = validItems.map((item) => {
          const qty = Number(item.quantity);
          const price = Number(item.unitPrice);
          const totalPrice = qty * price;
          return {
            itemName: item.itemName.trim(),
            quantity: qty,
            unit: item.unit.trim(),
            unitPrice: price,
            totalPrice,
          };
        });

        const totalAmount = mappedItems.reduce(
          (sum, item) => sum + item.totalPrice,
          0,
        );

        await tx.budget.create({
          data: {
            workProgramId: createdProgram.id,
            submittedBy: currentUserId,
            status: BudgetStatus.DRAFT,
            totalAmount,
            notes:
              dto.budgetNotes?.trim() ||
              'Rincian Anggaran Awal Program Kerja',
            items: {
              create: mappedItems,
            },
          },
        });
      }

      return tx.workProgram.findUnique({
        where: { id: createdProgram.id },
        include: {
          pic: {
            select: USER_PUBLIC_SELECT,
          },
          budgets: {
            include: {
              items: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              documents: true,
              progressReports: true,
              budgets: true,
              evaluations: true,
            },
          },
        },
      });
    });

    if (result) {
      await this.notificationsService.createNotification({
        userId: result.picId,
        type: 'WORK_PROGRAM_ASSIGNED',
        title: `Penugasan PIC Proker Baru: ${result.name}`,
        message: `Anda telah ditugaskan sebagai Penanggung Jawab (PIC) untuk program kerja "${result.name}".`,
        link: `/work-programs/${result.id}`,
      });
    }

    return result;
  }

  async update(id: string, dto: UpdateWorkProgramDto) {
    const existing = await this.prisma.workProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    if (dto.picId !== undefined) {
      const picUser = await this.prisma.user.findUnique({
        where: { id: dto.picId },
      });

      if (!picUser || !picUser.isActive) {
        throw new BadRequestException(
          'PIC yang dipilih tidak ditemukan atau berstatus nonaktif.',
        );
      }
    }

    const updateData: Prisma.WorkProgramUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
    }

    if (dto.picId !== undefined) {
      updateData.pic = { connect: { id: dto.picId } };
    }

    if (dto.deadline !== undefined) {
      updateData.deadline = new Date(dto.deadline);
    }

    if (dto.status !== undefined) {
      updateData.status = dto.status;
    }

    const updated = await this.prisma.workProgram.update({
      where: { id },
      data: updateData,
      include: {
        pic: {
          select: USER_PUBLIC_SELECT,
        },
        budgets: {
          include: {
            items: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            documents: true,
            progressReports: true,
            budgets: true,
            evaluations: true,
          },
        },
      },
    });

    if (dto.picId && dto.picId !== existing.picId) {
      await this.notificationsService.createNotification({
        userId: updated.picId,
        type: 'WORK_PROGRAM_ASSIGNED',
        title: `Penugasan PIC Proker: ${updated.name}`,
        message: `Anda telah ditugaskan sebagai Penanggung Jawab (PIC) baru untuk program kerja "${updated.name}".`,
        link: `/work-programs/${updated.id}`,
      });
    }

    return updated;
  }

  async updateStatus(id: string, dto: UpdateWorkProgramStatusDto) {
    const existing = await this.prisma.workProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    return this.prisma.workProgram.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: {
        pic: {
          select: USER_PUBLIC_SELECT,
        },
        budgets: {
          include: {
            items: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            documents: true,
            progressReports: true,
            budgets: true,
            evaluations: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.workProgram.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    // Strict Hard Delete with ON DELETE CASCADE (Mitigasi Eks UAT-19)
    await this.prisma.workProgram.delete({
      where: { id },
    });

    return {
      message: 'Program kerja beserta data terkait berhasil dihapus.',
      deletedId: id,
    };
  }
}
