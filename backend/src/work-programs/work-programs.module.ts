import { Module } from '@nestjs/common';
import { WorkProgramsController } from './work-programs.controller';
import { WorkProgramsService } from './work-programs.service';

@Module({
  controllers: [WorkProgramsController],
  providers: [WorkProgramsService],
  exports: [WorkProgramsService],
})
export class WorkProgramsModule {}
