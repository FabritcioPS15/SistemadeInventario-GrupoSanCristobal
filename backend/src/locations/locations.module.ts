import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { AreasService } from './areas.service';

@Module({
  controllers: [LocationsController],
  providers: [LocationsService, AreasService],
  exports: [LocationsService, AreasService],
})
export class LocationsModule {}
