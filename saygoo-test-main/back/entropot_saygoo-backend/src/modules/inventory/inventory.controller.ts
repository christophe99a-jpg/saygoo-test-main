import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtGuard } from '../../common/guards/jwt.guard';

@Controller('inventory')
@UseGuards(JwtGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('entry')
  addEntry(@Body() body: any) {
    return this.inventoryService.addEntry(body);
  }

  @Post('exit')
  addExit(@Body() body: any) {
    return this.inventoryService.addExit(body);
  }

  @Post('loss')
  addLoss(@Body() body: any) {
    return this.inventoryService.addLoss(body);
  }

  @Get('warehouse/:warehouse_id')
  getByWarehouse(@Param('warehouse_id') warehouse_id: string) {
    return this.inventoryService.getByWarehouse(warehouse_id);
  }

  @Get('stock/:warehouse_id/:product_id')
  getStock(
    @Param('warehouse_id') warehouse_id: string,
    @Param('product_id') product_id: string,
  ) {
    return this.inventoryService.getStock(warehouse_id, product_id);
  }

  @Get('alerts/:warehouse_id')
  getAlerts(@Param('warehouse_id') warehouse_id: string) {
    return this.inventoryService.getAlerts(warehouse_id);
  }
}