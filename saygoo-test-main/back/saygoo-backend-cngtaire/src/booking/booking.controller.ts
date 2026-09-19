import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BookingService } from './booking.service';
import type { BookingInput } from './booking.service';

@Controller('bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Post()
  create(@Body() body: BookingInput) {
    return this.bookingService.create(body);
  }

  @Get()
  findAll() {
    return this.bookingService.findAll();
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.bookingService.validate(id);
  }

  @Post(':id/refuse')
  refuse(@Param('id') id: string, @Body('reason') reason: string) {
    return this.bookingService.refuse(id, reason);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }
}
