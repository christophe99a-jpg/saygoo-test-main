-- CreateEnum
CREATE TYPE "StatutFactureCDA" AS ENUM ('BROUILLON', 'EMISE', 'PAYEE');

-- CreateEnum
CREATE TYPE "TypeLigne" AS ENUM ('CONSIGNATION', 'TERMINAL', 'PAL', 'DOUANE_OTR', 'CHAMBRE_COMMERCE', 'ANTASER', 'SEGUCE', 'HONORAIRE_TRANSITAIRE', 'AUTRE');

-- CreateTable
CREATE TABLE "FactureCDA" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "clientNom" TEXT NOT NULL,
    "statut" "StatutFactureCDA" NOT NULL DEFAULT 'BROUILLON',
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FactureCDA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "type" "TypeLigne" NOT NULL,
    "libelle" TEXT NOT NULL,
    "quantite" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "montant" DOUBLE PRECISION NOT NULL,
    "calculAuto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactureCDA_reference_key" ON "FactureCDA"("reference");

-- CreateIndex
CREATE INDEX "FactureCDA_statut_idx" ON "FactureCDA"("statut");

-- CreateIndex
CREATE INDEX "FactureCDA_dossierId_idx" ON "FactureCDA"("dossierId");

-- CreateIndex
CREATE INDEX "FactureCDA_reference_idx" ON "FactureCDA"("reference");

-- CreateIndex
CREATE INDEX "LigneFacture_factureId_idx" ON "LigneFacture"("factureId");

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "FactureCDA"("id") ON DELETE CASCADE ON UPDATE CASCADE;
