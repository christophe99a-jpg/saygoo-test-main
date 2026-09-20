-- CreateTable
CREATE TABLE "FactureStockage" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "tarifParTonneJour" DOUBLE PRECISION NOT NULL DEFAULT 3500,
    "quantite" DOUBLE PRECISION NOT NULL,
    "dureeJours" INTEGER NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'GENEREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactureStockage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactureStockage_reference_key" ON "FactureStockage"("reference");

-- CreateIndex
CREATE INDEX "FactureStockage_demandeId_idx" ON "FactureStockage"("demandeId");

-- AddForeignKey
ALTER TABLE "FactureStockage" ADD CONSTRAINT "FactureStockage_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeStockageEntrepot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
