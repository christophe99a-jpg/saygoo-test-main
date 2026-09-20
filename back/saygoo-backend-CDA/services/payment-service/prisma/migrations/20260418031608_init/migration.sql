-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'SUCCES', 'ECHEC', 'REMBOURSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "MethodePaiement" AS ENUM ('MOBILE_MONEY', 'VIREMENT_BANCAIRE', 'ESPECES', 'CARTE_BANCAIRE', 'WAVE', 'FLOOZ', 'TMONEY');

-- CreateEnum
CREATE TYPE "DeviseCode" AS ENUM ('XOF', 'EUR', 'USD', 'GBP');

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "factureId" TEXT,
    "factureNum" TEXT,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTel" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "devise" "DeviseCode" NOT NULL DEFAULT 'XOF',
    "methode" "MethodePaiement" NOT NULL,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'EN_ATTENTE',
    "referenceExterne" TEXT,
    "numeroTransaction" TEXT,
    "notes" TEXT,
    "agentId" TEXT,
    "agentNom" TEXT,
    "organisationId" TEXT,
    "dateEcheance" TIMESTAMP(3),
    "datePaiement" TIMESTAMP(3),
    "webhookData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativePaiement" (
    "id" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "message" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativePaiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigPaiement" (
    "id" TEXT NOT NULL,
    "methode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_reference_key" ON "Paiement"("reference");

-- CreateIndex
CREATE INDEX "Paiement_clientId_idx" ON "Paiement"("clientId");

-- CreateIndex
CREATE INDEX "Paiement_factureId_idx" ON "Paiement"("factureId");

-- CreateIndex
CREATE INDEX "Paiement_statut_idx" ON "Paiement"("statut");

-- CreateIndex
CREATE INDEX "Paiement_reference_idx" ON "Paiement"("reference");

-- CreateIndex
CREATE INDEX "TentativePaiement_paiementId_idx" ON "TentativePaiement"("paiementId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigPaiement_methode_key" ON "ConfigPaiement"("methode");

-- AddForeignKey
ALTER TABLE "TentativePaiement" ADD CONSTRAINT "TentativePaiement_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "Paiement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
