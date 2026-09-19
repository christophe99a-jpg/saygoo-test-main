import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { StockageService } from './stockage.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('stockage')
export class StockageController {
  constructor(private readonly stockageService: StockageService) {}

  // ── Réception / liste ────────────────────────────────────────────────────────────
  @Post()
  create(@Body() body: any) {
    return this.stockageService.create(body);
  }

  @Get()
    findAll(
    @Query('search') search?: string,
    @Query('statut') statut?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.stockageService.findAll(search, statut, clientId);
  }

    // ── 4. Gestion du stock : marchandises actuellement stockées ────────────────────
  @Get('stock-actuel')
  getStockActuel(@Query('search') search?: string) {
    return this.stockageService.getStockActuel(search);
  }

  // ── Affectation d'emplacement (routes fixes — AVANT les routes :id) ────────────
  @Get('emplacements/disponibles')
  getEmplacementsDisponibles(
    @Query('warehouseId') warehouseId?: string,
    @Query('zone') zone?: string,
  ) {
    return this.stockageService.getEmplacementsDisponibles(warehouseId, zone);
  }

  @Get('emplacements/occupation/:warehouseId')
  getOccupationParZone(@Param('warehouseId') warehouseId: string) {
    return this.stockageService.getOccupationParZone(warehouseId);
  }

  // ── Détail (route :id — APRÈS les routes fixes) ─────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stockageService.findOne(id);
  }

  // ── Acceptation / refus / demande d'infos ───────────────────────────────────────
  @Patch(':id/accepter')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  accepter(@Param('id') id: string, @Req() req: any) {
    return this.stockageService.accepter(id, req.user?.sub);
  }

  @Patch(':id/refuser')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  refuser(@Param('id') id: string, @Body('motif') motif: string, @Req() req: any) {
    return this.stockageService.refuser(id, motif, req.user?.sub);
  }

  @Post(':id/demander-infos')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  demanderInfos(@Param('id') id: string, @Body('commentaire') commentaire: string, @Req() req: any) {
    return this.stockageService.demanderInfos(id, commentaire, req.user?.sub);
  }

  @Post(':id/affecter')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  affecterEmplacement(
    @Param('id') id: string,
    @Body() body: { emplacementId: string; dateEntreeReelle?: string; dureeEstimeeJours?: number },
    @Req() req: any,
  ) {
    return this.stockageService.affecterEmplacement(id, body, req.user?.sub);
  }

  // ── Historique ───────────────────────────────────────────────────────────────────
  @Get(':id/historique')
  getHistorique(@Param('id') id: string) {
    return this.stockageService.getHistorique(id);
  }

    // ── 5. Sortie marchandise ────────────────────────────────────────────────────────
  @Post(':id/autoriser-sortie')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  autoriserSortie(
    @Param('id') id: string,
    @Body() body: {
      modeTransport: 'CAMION_INTERNE_SAYGOO' | 'TRANSPORTEUR_EXTERNE';
      dateSortie: string;
      badConfirme: boolean;
      autorisationDouaneConfirmee: boolean;
      factureStockageConfirmee: boolean;
    },
    @Req() req: any,
  ) {
    return this.stockageService.autoriserSortie(id, body, req.user?.sub);
  }

    // ── 8. Facturation stockage ──────────────────────────────────────────────────────
  @Post(':id/facturer')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  genererFacture(@Param('id') id: string, @Body('tarifParTonneJour') tarifParTonneJour: number, @Req() req: any) {
    return this.stockageService.genererFacture(id, tarifParTonneJour, req.user?.sub);
  }

  @Get(':id/factures')
  listerFactures(@Param('id') id: string) {
    return this.stockageService.listerFactures(id);
  }

  @Patch('factures/:factureId/payer')
  @UseGuards(JwtGuard)
  @Roles('ADMIN', 'MANAGER')
  marquerFacturePayee(@Param('factureId') factureId: string) {
    return this.stockageService.marquerFacturePayee(factureId);
  }
}