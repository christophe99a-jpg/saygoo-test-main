-- CreateEnum
CREATE TYPE "StatutStockage" AS ENUM ('NOUVEAU', 'ACCEPTE', 'STOCKE', 'PRET_A_SORTIR', 'CLOTURE', 'REFUSE');

-- CreateEnum
CREATE TYPE "TypeStockage" AS ENUM ('VRAC', 'CONTENEUR');

-- CreateEnum
CREATE TYPE "ModeSortie" AS ENUM ('CAMION', 'CONTENEUR', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutTransport" AS ENUM ('NOUVEAU', 'RECHERCHE_TRANSPORTEUR', 'AFFECTE', 'EN_TRANSPORT', 'LIVRE', 'REFUSE');

-- CreateEnum
CREATE TYPE "LieuChargement" AS ENUM ('PAL', 'ENTREPOT_DOUANE');

-- CreateTable
CREATE TABLE "DemandeStockage" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "blReference" TEXT,
    "nature" TEXT NOT NULL,
    "typeStockage" "TypeStockage" NOT NULL,
    "quantite" DOUBLE PRECISION,
    "uniteQuantite" TEXT,
    "dateEntreeSouhaitee" TIMESTAMP(3),
    "dureeEstimeeJours" INTEGER,
    "statut" "StatutStockage" NOT NULL DEFAULT 'NOUVEAU',
    "motifRefus" TEXT,
    "zone" TEXT,
    "allee" TEXT,
    "emplacement" TEXT,
    "dateEntreeReelle" TIMESTAMP(3),
    "dateSortiePrevue" TIMESTAMP(3),
    "quantiteSortie" DOUBLE PRECISION,
    "modeSortie" "ModeSortie",
    "dateSortieReelle" TIMESTAMP(3),
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeStockage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStockage" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentStockage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStockage" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userNom" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStockage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandeTransport" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "lieuChargement" "LieuChargement" NOT NULL,
    "destination" TEXT NOT NULL,
    "paysDestination" TEXT,
    "natureMarchandise" TEXT,
    "quantite" DOUBLE PRECISION,
    "poidsKg" DOUBLE PRECISION,
    "statut" "StatutTransport" NOT NULL DEFAULT 'NOUVEAU',
    "motifRefus" TEXT,
    "transporteurNom" TEXT,
    "typeCamion" TEXT,
    "conducteurNom" TEXT,
    "conducteurTelephone" TEXT,
    "dateChargement" TIMESTAMP(3),
    "dernierePosition" TEXT,
    "dateLivraison" TIMESTAMP(3),
    "podUrl" TEXT,
    "signatureConfirmee" BOOLEAN NOT NULL DEFAULT false,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandeTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OffreTransporteur" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "transporteurNom" TEXT NOT NULL,
    "note" DOUBLE PRECISION,
    "disponibilite" TEXT,
    "selectionnee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OffreTransporteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTransport" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "uploadePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTransport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueTransport" (
    "id" TEXT NOT NULL,
    "demandeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userNom" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueTransport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandeStockage_reference_key" ON "DemandeStockage"("reference");

-- CreateIndex
CREATE INDEX "DemandeStockage_statut_idx" ON "DemandeStockage"("statut");

-- CreateIndex
CREATE INDEX "DemandeStockage_clientId_idx" ON "DemandeStockage"("clientId");

-- CreateIndex
CREATE INDEX "DemandeStockage_reference_idx" ON "DemandeStockage"("reference");

-- CreateIndex
CREATE INDEX "DocumentStockage_demandeId_idx" ON "DocumentStockage"("demandeId");

-- CreateIndex
CREATE INDEX "HistoriqueStockage_demandeId_idx" ON "HistoriqueStockage"("demandeId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandeTransport_reference_key" ON "DemandeTransport"("reference");

-- CreateIndex
CREATE INDEX "DemandeTransport_statut_idx" ON "DemandeTransport"("statut");

-- CreateIndex
CREATE INDEX "DemandeTransport_clientId_idx" ON "DemandeTransport"("clientId");

-- CreateIndex
CREATE INDEX "DemandeTransport_reference_idx" ON "DemandeTransport"("reference");

-- CreateIndex
CREATE INDEX "OffreTransporteur_demandeId_idx" ON "OffreTransporteur"("demandeId");

-- CreateIndex
CREATE INDEX "DocumentTransport_demandeId_idx" ON "DocumentTransport"("demandeId");

-- CreateIndex
CREATE INDEX "HistoriqueTransport_demandeId_idx" ON "HistoriqueTransport"("demandeId");

-- AddForeignKey
ALTER TABLE "DocumentStockage" ADD CONSTRAINT "DocumentStockage_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeStockage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStockage" ADD CONSTRAINT "HistoriqueStockage_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeStockage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OffreTransporteur" ADD CONSTRAINT "OffreTransporteur_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeTransport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTransport" ADD CONSTRAINT "DocumentTransport_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeTransport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueTransport" ADD CONSTRAINT "HistoriqueTransport_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeTransport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
