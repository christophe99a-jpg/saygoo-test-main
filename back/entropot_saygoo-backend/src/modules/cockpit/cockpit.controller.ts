import { Controller, Get, Query } from '@nestjs/common';
import { CockpitService } from './cockpit.service';

@Controller('cockpit')
export class CockpitController {
  constructor(private readonly cockpitService: CockpitService) {}

  @Get()
  getTableauDeBord(@Query('warehouseId') warehouseId?: string) {
    return this.cockpitService.getTableauDeBord(warehouseId);
  }

  @Get('demandes-en-attente')
  getDemandesEnAttente() {
    return this.cockpitService.getDemandesEnAttente();
  }
}