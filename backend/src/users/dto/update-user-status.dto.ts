import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({ message: 'Status isActive harus berupa nilai boolean' })
  isActive: boolean;
}
