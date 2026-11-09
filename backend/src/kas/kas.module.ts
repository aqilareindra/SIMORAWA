import { Module } from '@nestjs/common';
import { KasController } from './kas.controller';
import { KasService } from './kas.service';

@Module({
  controllers: [KasController],
  providers: [KasService],
  exports: [KasService],
})
export class KasModule {}
