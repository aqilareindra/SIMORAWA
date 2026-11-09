import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { getUploadDir } from './multer.config';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private removePhysicalFileIfExists(storedFilePath: string) {
    try {
      const uploadDir = getUploadDir();
      const fullPath = path.join(uploadDir, path.basename(storedFilePath));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // Abaikan jika gagal menghapus file fisik
    }
  }

  async uploadMasterTemplateKak(
    file: Express.Multer.File,
    currentUserId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File PDF Template KAK wajib diunggah.');
    }

    // Mitigasi Eks UAT-22: workProgramId = null khusus Master Template KAK,
    // type = 'TEMPLATE_KAK' (VARCHAR 100), mimeType = 'application/pdf' (VARCHAR 100)
    return this.prisma.document.create({
      data: {
        workProgramId: null,
        uploadedBy: currentUserId,
        type: 'TEMPLATE_KAK',
        mimeType: file.mimetype || 'application/pdf',
        fileName: file.originalname,
        filePath: file.filename,
        fileSize: file.size,
      },
      include: {
        uploader: {
          select: USER_PUBLIC_SELECT,
        },
      },
    });
  }

  async getLatestTemplateKak() {
    const latestTemplate = await this.prisma.document.findFirst({
      where: {
        type: 'TEMPLATE_KAK',
        workProgramId: null,
      },
      include: {
        uploader: {
          select: USER_PUBLIC_SELECT,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return latestTemplate;
  }

  async uploadWorkProgramDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    currentUserId: string,
  ) {
    if (!file) {
      throw new BadRequestException('File PDF dokumen wajib diunggah.');
    }

    const workProgram = await this.prisma.workProgram.findUnique({
      where: { id: dto.workProgramId },
    });

    if (!workProgram) {
      this.removePhysicalFileIfExists(file.filename);
      throw new NotFoundException('Program kerja tidak ditemukan.');
    }

    // Mitigasi Eks UAT-22: Simpan kategori ('KAK', 'LPJ', 'SURAT', 'LAINNYA') di kolom `type`
    // dan MIME type ('application/pdf') di kolom `mimeType`
    return this.prisma.document.create({
      data: {
        workProgramId: dto.workProgramId,
        uploadedBy: currentUserId,
        type: dto.type,
        mimeType: file.mimetype || 'application/pdf',
        fileName: file.originalname,
        filePath: file.filename,
        fileSize: file.size,
      },
      include: {
        uploader: {
          select: USER_PUBLIC_SELECT,
        },
      },
    });
  }

  async getDocumentForDownload(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    const uploadDir = getUploadDir();
    const fullPath = path.join(uploadDir, path.basename(document.filePath));

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException(
        'File fisik dokumen tidak ditemukan di penyimpanan server.',
      );
    }

    return {
      document,
      fullPath,
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Dokumen tidak ditemukan.');
    }

    await this.prisma.document.delete({
      where: { id },
    });

    this.removePhysicalFileIfExists(existing.filePath);

    return {
      message: 'Dokumen berhasil dihapus.',
      deletedId: id,
    };
  }
}
