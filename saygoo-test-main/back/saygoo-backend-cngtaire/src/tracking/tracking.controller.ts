import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingStatus } from './tracking.entity';

@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Patch(':bl_id')
  updateStatus(
    @Param('bl_id') bl_id: string,
    @Body() body: {
      status: TrackingStatus;
      location?: string;
      notes?: string;
    },
  ) {
    return this.trackingService.updateStatus(bl_id, body.status, body.location, body.notes);
  }

  @Get(':bl_id')
  findByBl(@Param('bl_id') bl_id: string) {
    return this.trackingService.findByBl(bl_id);
  }

  @Get()
  findAll() {
    return this.trackingService.findAll();
  }
}