-- CreateEnum
CREATE TYPE "ClasseCompte" AS ENUM ('CLASSE_1', 'CLASSE_2', 'CLASSE_3', 'CLASSE_4', 'CLASSE_5', 'CLASSE_6', 'CLASSE_7', 'CLASSE_8');

-- CreateEnum
CREATE TYPE "SensCompte" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "TypeJournal" AS ENUM ('VENTE', 'ACHAT', 'BANQUE', 'CAISSE', 'OPERATIONS_DIVERSES', 'A_NOUVEAUX');

-- CreateEnum
CREATE TYPE "StatutExercice" AS ENUM ('OUVERT', 'CLOTURE');

-- CreateEnum
CREATE TYPE "StatutEcriture" AS ENUM ('BROUILLON', 'VALIDEE', 'EXTOURNEE');

-- CreateEnum
CREATE TYPE "StatutAjustement" AS ENUM ('DEMANDE', 'VALIDE', 'REJETE');

-- CreateEnum
CREATE TYPE "SensAjustement" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "comptes_comptables" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "classe" "ClasseCompte" NOT NULL,
    "sens" "SensCompte" NOT NULL,
    "collectif" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journaux" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "type" "TypeJournal" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journaux_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercices" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutExercice" NOT NULL DEFAULT 'OUVERT',
    "clotureLe" TIMESTAMP(3),
    "cloturePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecritures" (
    "id" TEXT NOT NULL,
    "numero" TEXT,
    "journalId" TEXT NOT NULL,
    "exerciceId" TEXT NOT NULL,
    "dateEcriture" TIMESTAMP(3) NOT NULL,
    "datePiece" TIMESTAMP(3),
    "reference" TEXT,
    "libelle" TEXT NOT NULL,
    "statut" "StatutEcriture" NOT NULL DEFAULT 'BROUILLON',
    "totalDebit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "dlnuRef" TEXT,
    "extourneDeId" TEXT,
    "valideeLe" TIMESTAMP(3),
    "valideePar" TEXT,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecritures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_ecriture" (
    "id" TEXT NOT NULL,
    "ecritureId" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "tiersCode" TEXT,
    "libelle" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lignes_ecriture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustements_comptables" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT,
    "compteCln" TEXT,
    "sens" "SensAjustement" NOT NULL,
    "montant" DECIMAL(15,2) NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "motif" TEXT NOT NULL,
    "pieceJointe" TEXT,
    "dossierRef" TEXT,
    "factureRef" TEXT,
    "statut" "StatutAjustement" NOT NULL DEFAULT 'DEMANDE',
    "demandePar" TEXT NOT NULL,
    "valideePar" TEXT,
    "valideeLe" TIMESTAMP(3),
    "motifRejet" TEXT,
    "ecritureId" TEXT,
    "clnNotifie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ajustements_comptables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "comptes_comptables_numero_key" ON "comptes_comptables"("numero");

-- CreateIndex
CREATE INDEX "comptes_comptables_classe_idx" ON "comptes_comptables"("classe");

-- CreateIndex
CREATE INDEX "comptes_comptables_numero_idx" ON "comptes_comptables"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "journaux_code_key" ON "journaux"("code");

-- CreateIndex
CREATE UNIQUE INDEX "exercices_annee_key" ON "exercices"("annee");

-- CreateIndex
CREATE UNIQUE INDEX "ecritures_numero_key" ON "ecritures"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ecritures_extourneDeId_key" ON "ecritures"("extourneDeId");

-- CreateIndex
CREATE INDEX "ecritures_dateEcriture_idx" ON "ecritures"("dateEcriture");

-- CreateIndex
CREATE INDEX "ecritures_statut_idx" ON "ecritures"("statut");

-- CreateIndex
CREATE INDEX "ecritures_reference_idx" ON "ecritures"("reference");

-- CreateIndex
CREATE INDEX "ecritures_dlnuRef_idx" ON "ecritures"("dlnuRef");

-- CreateIndex
CREATE INDEX "ecritures_sourceType_sourceId_idx" ON "ecritures"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "lignes_ecriture_ecritureId_idx" ON "lignes_ecriture"("ecritureId");

-- CreateIndex
CREATE INDEX "lignes_ecriture_compteId_idx" ON "lignes_ecriture"("compteId");

-- CreateIndex
CREATE INDEX "lignes_ecriture_tiersCode_idx" ON "lignes_ecriture"("tiersCode");

-- CreateIndex
CREATE UNIQUE INDEX "ajustements_comptables_reference_key" ON "ajustements_comptables"("reference");

-- CreateIndex
CREATE INDEX "ajustements_comptables_clientId_idx" ON "ajustements_comptables"("clientId");

-- CreateIndex
CREATE INDEX "ajustements_comptables_statut_idx" ON "ajustements_comptables"("statut");

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "journaux"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_exerciceId_fkey" FOREIGN KEY ("exerciceId") REFERENCES "exercices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecritures" ADD CONSTRAINT "ecritures_extourneDeId_fkey" FOREIGN KEY ("extourneDeId") REFERENCES "ecritures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_ecriture" ADD CONSTRAINT "lignes_ecriture_ecritureId_fkey" FOREIGN KEY ("ecritureId") REFERENCES "ecritures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_ecriture" ADD CONSTRAINT "lignes_ecriture_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_comptables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
