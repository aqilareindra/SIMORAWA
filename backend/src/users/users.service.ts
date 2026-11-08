import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const USER_SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      if (query.isActive === 'true') {
        where.isActive = true;
      } else if (query.isActive === 'false') {
        where.isActive = false;
      }
    }

    if (query.search && query.search.trim() !== '') {
      const keyword = query.search.trim();
      where.OR = [
        { name: { contains: keyword } },
        { email: { contains: keyword } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: USER_SAFE_SELECT,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findPicCandidates() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: USER_SAFE_SELECT,
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email sudah terdaftar.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: dto.role,
        isActive: dto.isActive ?? true,
      },
      select: USER_SAFE_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Admin tidak dapat menonaktifkan akunnya sendiri yang sedang digunakan.',
      );
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== existingUser.email) {
        const duplicateEmail = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (duplicateEmail) {
          throw new ConflictException('Email sudah digunakan oleh pengguna lain.');
        }
        updateData.email = normalizedEmail;
      }
    }

    if (dto.role !== undefined) {
      updateData.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    if (dto.password !== undefined && dto.password.trim() !== '') {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SAFE_SELECT,
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentUserId: string,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Admin tidak dapat menonaktifkan akunnya sendiri yang sedang digunakan.',
      );
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: dto.isActive,
      },
      select: USER_SAFE_SELECT,
    });
  }
}
