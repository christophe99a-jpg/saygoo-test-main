-- CreateEnum
CREATE TYPE "MethodeInstruction" AS ENUM ('VIREMENT_BANCAIRE', 'VISA_BUSINESS', 'PAYGATE_FLOOZ', 'TMONEY');

-- CreateEnum
CREATE TYPE "StatutInstruction" AS ENUM ('DEMANDE', 'TRANSMISE', 'EN_TRAITEMENT', 'EXECUTEE', 'REJETEE');

-- CreateEnum
CREATE TYPE "TypeCreditInterne" AS ENUM ('BONUS_COMMERCIAL', 'POINTS_FIDELITE', 'AVOIR_COMMERCIAL', 'REMBOURSEMENT', 'AJUSTEMENT_COMPTABLE');

-- CreateEnum
CREATE TYPE "ServiceEcosysteme" AS ENUM ('FRET_TERRESTRE', 'FRET_MARITIME', 'FRET_AERIEN', 'TRANSIT_DOUANIER', 'ENTREPOSAGE', 'INSPECTION', 'ASSURANCE_CARGO', 'MANUTENTION', 'SERVICES_ADMINISTRATIFS');

-- CreateEnum
CREATE TYPE "StatutReservation" AS ENUM ('ACTIVE', 'LIBEREE', 'CONSOMMEE');

-- CreateEnum
CREATE TYPE "TypeOperationCLN" AS ENUM ('CREDIT_INTERNE', 'RESERVATION_FONDS', 'LIBERATION_FONDS', 'PAIEMENT_SERVICE', 'COMPENSATION', 'INSTRUCTION_PAIEMENT');

-- CreateTable
CREATE TABLE "CompteLogistique" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "solde" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldeReserve" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "devise" "DeviseCode" NOT NULL DEFAULT 'XOF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompteLogistique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructionPaiement" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "methode" "MethodeInstruction" NOT NULL,
    "partenaire" TEXT,
    "statut" "StatutInstruction" NOT NULL DEFAULT 'DEMANDE',
    "motifRejet" TEXT,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructionPaiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationFonds" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "motif" TEXT,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "statut" "StatutReservation" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationFonds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationCLN" (
    "id" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "type" "TypeOperationCLN" NOT NULL,
    "sousType" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "soldeAvant" DOUBLE PRECISION NOT NULL,
    "soldeApres" DOUBLE PRECISION NOT NULL,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "clientId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationCLN_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompteLogistique_organisationId_key" ON "CompteLogistique"("organisationId");

-- CreateIndex
CREATE INDEX "CompteLogistique_organisationId_idx" ON "CompteLogistique"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstructionPaiement_reference_key" ON "InstructionPaiement"("reference");

-- CreateIndex
CREATE INDEX "InstructionPaiement_compteId_idx" ON "InstructionPaiement"("compteId");

-- CreateIndex
CREATE INDEX "InstructionPaiement_statut_idx" ON "InstructionPaiement"("statut");

-- CreateIndex
CREATE INDEX "ReservationFonds_compteId_idx" ON "ReservationFonds"("compteId");

-- CreateIndex
CREATE INDEX "ReservationFonds_statut_idx" ON "ReservationFonds"("statut");

-- CreateIndex
CREATE INDEX "OperationCLN_compteId_idx" ON "OperationCLN"("compteId");

-- CreateIndex
CREATE INDEX "OperationCLN_type_idx" ON "OperationCLN"("type");

-- AddForeignKey
ALTER TABLE "InstructionPaiement" ADD CONSTRAINT "InstructionPaiement_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteLogistique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationFonds" ADD CONSTRAINT "ReservationFonds_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteLogistique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationCLN" ADD CONSTRAINT "OperationCLN_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "CompteLogistique"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
