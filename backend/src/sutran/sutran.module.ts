import { Module } from '@nestjs/common';
import { SutranService } from './sutran.service';
import { SutranController } from './sutran.controller';

@Module({
  controllers: [SutranController],
  providers: [SutranService],
})
export class SutranModule {}
