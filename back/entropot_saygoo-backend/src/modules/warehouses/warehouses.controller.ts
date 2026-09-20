import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  create(@Body() body: any) {
    return this.warehousesService.create(body);
  }

  @Get()
  findAll() {
    return this.warehousesService.findAll();
  }

  @Get('availability')
  getAvailability(
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('temperature_type') temperature_type?: string,
  ) {
    return this.warehousesService.getAvailability(
      latitude ? parseFloat(latitude) : undefined,
      longitude ? parseFloat(longitude) : undefined,
      temperature_type,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.warehousesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  update(@Param('id') id: string, @Body() body: any) {
    return this.warehousesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles('ADMIN')
  delete(@Param('id') id: string) {
    return this.warehousesService.delete(id);
  }
}