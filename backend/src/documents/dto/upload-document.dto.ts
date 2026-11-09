import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const ALLOWED_DOCUMENT_TYPES = [
  'KAK',
  'LPJ',
  'SURAT',
  'LAINNYA',
] as const;

export type AllowedDocumentType = (typeof ALLOWED_DOCUMENT_TYPES)[number];

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'ID Program Kerja (workProgramId) wajib diisi' })
  workProgramId: string;

  @IsString()
  @IsIn(ALLOWED_DOCUMENT_TYPES, {
    message: 'Kategori dokumen harus salah satu dari: KAK, LPJ, SURAT, LAINNYA',
  })
  type: AllowedDocumentType;
}
