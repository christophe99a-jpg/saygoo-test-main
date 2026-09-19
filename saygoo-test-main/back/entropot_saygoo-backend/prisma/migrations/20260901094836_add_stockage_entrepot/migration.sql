-- CreateTable
CREATE TABLE "Emplacement" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "allee" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "capaciteTonnes" DOUBLE PRECISION,
    "occupe" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Emplacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeStockageEntrepot" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierRef" TEXT,
    "clientNom" TEXT NOT NULL,
    "typeStockage" TEXT NOT NULL,
    "marchandise" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION,
    "uniteQuantite" TEXT,
    "dureeEstimeeJours" INTEGER,
    "statut" TEXT NOT NULL DEFAULT 'NOUVEAU',
    "motifRefus" TEXT,
    "warehouseId" TEXT,
    "emplacementId" TEXT,
    "dateEntreeReelle" TIMESTAMP(3),
    "dateSortiePrevue" TIMESTAMP(3),
    "dateSortieReelle" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeStockageEntrepot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStockageEntrepot" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStockageEntrepot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Emplacement_zone_idx" ON "Emplacement"("zone");

-- CreateIndex
CREATE INDEX "Emplacement_occupe_idx" ON "Emplacement"("occupe");

-- CreateIndex
CREATE UNIQUE INDEX "Emplacement_warehouseId_slot_key" ON "Emplacement"("warehouseId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeStockageEntrepot_reference_key" ON "DemandeStockageEntrepot"("reference");

-- CreateIndex
CREATE INDEX "DemandeStockageEntrepot_statut_idx" ON "DemandeStockageEntrepot"("statut");

-- CreateIndex
CREATE INDEX "DemandeStockageEntrepot_reference_idx" ON "DemandeStockageEntrepot"("reference");

-- CreateIndex
CREATE INDEX "HistoriqueStockageEntrepot_demandeId_idx" ON "HistoriqueStockageEntrepot"("demandeId");

-- AddForeignKey
ALTER TABLE "Emplacement" ADD CONSTRAINT "Emplacement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeStockageEntrepot" ADD CONSTRAINT "DemandeStockageEntrepot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandeStockageEntrepot" ADD CONSTRAINT "DemandeStockageEntrepot_emplacementId_fkey" FOREIGN KEY ("emplacementId") REFERENCES "Emplacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStockageEntrepot" ADD CONSTRAINT "HistoriqueStockageEntrepot_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeStockageEntrepot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
