import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { pdfMulterOptions } from './multer.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('template-kak')
  async getTemplateKak() {
    return this.documentsService.getLatestTemplateKak();
  }

  @Post('template-kak')
  @Roles(Role.SEKRETARIS, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions))
  async uploadTemplateKak(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.documentsService.uploadMasterTemplateKak(file, currentUserId);
  }

  @Post('upload')
  @Roles(Role.PIC, Role.SEKRETARIS, Role.KADIV, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', pdfMulterOptions))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.documentsService.uploadWorkProgramDocument(
      file,
      uploadDocumentDto,
      currentUserId,
    );
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string, @Res() res: Response) {
    const { document, fullPath } =
      await this.documentsService.getDocumentForDownload(id);

    const safeFileName = encodeURIComponent(document.fileName);
    res.setHeader('Content-Type', document.mimeType || 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.fileName.replace(/"/g, '')}"; filename*=UTF-8''${safeFileName}`,
    );

    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);
  }

  @Delete(':id')
  @Roles(Role.SEKRETARIS, Role.PIC, Role.KADIV, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
