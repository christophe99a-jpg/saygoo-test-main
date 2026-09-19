import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  // ── Alertes automatiques (route fixe — AVANT les routes :id) ────────────────────
  @Get('alertes')
  getAlertes(@Query('warehouseId') warehouseId?: string) {
    return this.incidentsService.getAlertesAutomatiques(warehouseId);
  }

  // ── 7. Déclaration rapide d'un incident ─────────────────────────────────────────
  @Post()
  declarer(@Body() body: any, @Req() req: any) {
    return this.incidentsService.declarer({ ...body, declarePar: req.user?.sub });
  }

  // ── 6. Liste des incidents ───────────────────────────────────────────────────────
  @Get()
  findAll(
    @Query('statut') statut?: string,
    @Query('type') type?: string,
    @Query('zone') zone?: string,
  ) {
    return this.incidentsService.findAll(statut, type, zone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id/resoudre')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  resoudre(@Param('id') id: string) {
    return this.incidentsService.resoudre(id);
  }

  @Patch(':id/gravite')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  ajusterGravite(@Param('id') id: string, @Body('gravite') gravite: 'ROUGE' | 'ORANGE' | 'JAUNE') {
    return this.incidentsService.ajusterGravite(id, gravite);
  }
}