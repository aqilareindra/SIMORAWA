import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

export function getUploadDir(): string {
  const dir = path.resolve(
    process.cwd(),
    process.env.UPLOAD_DIR || './uploads',
  );
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export const pdfMulterOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const uploadDir = getUploadDir();
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const safeOriginal = file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_');
      const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${uniquePrefix}-${safeOriginal}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // Maksimal 10 MB (AGENTS.md & Mitigasi UAT-22)
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = ext === '.pdf';

    if (!isPdfMime || !isPdfExt) {
      return cb(
        new BadRequestException(
          'Hanya file dokumen berformat PDF (.pdf) dengan ukuran maksimal 10MB yang diperbolehkan.',
        ),
        false,
      );
    }

    cb(null, true);
  },
};
