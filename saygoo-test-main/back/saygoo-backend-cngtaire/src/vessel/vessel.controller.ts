import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { VesselService } from './vessel.service';
import { Vessel, VesselStatus } from './vessel.entity';

@Controller('vessels')
export class VesselController {
  constructor(private vesselService: VesselService) {}

  @Post()
  create(@Body() body: Partial<Vessel>) {
    return this.vesselService.create(body);
  }

  // GET /vessels?month=7&year=2026
  @Get()
  findAll(@Query('month') month?: string, @Query('year') year?: string) {
    return this.vesselService.findAll(
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vesselService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Vessel>) {
    return this.vesselService.update(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: VesselStatus) {
    return this.vesselService.updateStatus(id, status);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.vesselService.delete(id);
  }
}
