import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { BlService } from './bl.service';
import { BLStatus } from './bl.entity';

@Controller('bl')
export class BlController {
  constructor(private blService: BlService) {}

  @Post()
  create(@Body() body: {
    bl_number: string;
    vessel_name?: string;
    client_name?: string;
    cargo?: string;
    arrival_date?: string;
  }) {
    return this.blService.create(body);
  }

  @Get()
  findAll() {
    return this.blService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.blService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{
    bl_number: string;
    vessel_name: string;
    client_name: string;
    cargo: string;
    arrival_date: string;
    status: BLStatus;
  }>) {
    return this.blService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.blService.delete(id);
  }
}