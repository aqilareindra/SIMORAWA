import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';

export class QueryUsersDto {
  @IsOptional()
  @IsEnum(Role, { message: 'Filter role tidak valid' })
  role?: Role;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
