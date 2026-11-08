import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama wajib diisi' })
  name: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email wajib diisi' })
  email: string;

  @IsString()
  @MinLength(12, { message: 'Password minimal harus 12 karakter' })
  password: string;

  @IsEnum(Role, { message: 'Role tidak valid' })
  role: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
