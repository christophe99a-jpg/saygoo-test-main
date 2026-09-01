import { Controller, Post, Get, Patch, Delete, Body, Param } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Body() body: any) {
    return this.reservationsService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reservationsService.findOne(id);
  }

  @Get('user/:user_id')
  findByUser(@Param('user_id') user_id: string) {
    return this.reservationsService.findByUser(user_id);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.reservationsService.confirm(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.reservationsService.update(id, body);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.reservationsService.cancel(id);
  }
}