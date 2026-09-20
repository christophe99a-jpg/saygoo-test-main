-- CreateEnum
CREATE TYPE "StatutDossier" AS ENUM ('EN_ATTENTE', 'EN_COURS', 'DECLARE', 'DEDOUANE', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "RegimeDouanier" AS ENUM ('IM4', 'IM7', 'TRANSIT', 'REGIME_SUSPENSIF', 'EXPORT');

-- CreateEnum
CREATE TYPE "TypeMarchandise" AS ENUM ('CONTENEUR_20', 'CONTENEUR_40', 'VRAC', 'VEHICULE', 'COLIS', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CATEGORIE_A', 'CATEGORIE_B', 'CATEGORIE_C');

-- CreateTable
CREATE TABLE "Dossier" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "agentId" TEXT,
    "agentNom" TEXT,
    "statut" "StatutDossier" NOT NULL DEFAULT 'EN_ATTENTE',
    "typeMarchandise" "TypeMarchandise" NOT NULL,
    "regimeDouanier" "RegimeDouanier" NOT NULL DEFAULT 'IM4',
    "typeVehicule" "TypeVehicule",
    "description" TEXT,
    "poids" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "valeurFOB" DOUBLE PRECISION,
    "valeurFret" DOUBLE PRECISION,
    "valeurAssurance" DOUBLE PRECISION,
    "valeurCIF" DOUBLE PRECISION,
    "devise" TEXT NOT NULL DEFAULT 'XOF',
    "numeroDeclaration" TEXT,
    "numeroConnaissement" TEXT,
    "paysOrigine" TEXT,
    "portEmbarquement" TEXT,
    "portDestination" TEXT DEFAULT 'Lomé',
    "dateArrivee" TIMESTAMP(3),
    "dateDedouanement" TIMESTAMP(3),
    "dateLivraison" TIMESTAMP(3),
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueDossier" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "userNom" TEXT NOT NULL,
    "ancienStatut" "StatutDossier",
    "nouveauStatut" "StatutDossier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueDossier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "taille" INTEGER,
    "uploadePar" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userNom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dossier_reference_key" ON "Dossier"("reference");

-- CreateIndex
CREATE INDEX "Dossier_statut_idx" ON "Dossier"("statut");

-- CreateIndex
CREATE INDEX "Dossier_clientId_idx" ON "Dossier"("clientId");

-- CreateIndex
CREATE INDEX "Dossier_reference_idx" ON "Dossier"("reference");

-- CreateIndex
CREATE INDEX "Dossier_agentId_idx" ON "Dossier"("agentId");

-- CreateIndex
CREATE INDEX "HistoriqueDossier_dossierId_idx" ON "HistoriqueDossier"("dossierId");

-- CreateIndex
CREATE INDEX "Document_dossierId_idx" ON "Document"("dossierId");

-- CreateIndex
CREATE INDEX "Note_dossierId_idx" ON "Note"("dossierId");

-- AddForeignKey
ALTER TABLE "HistoriqueDossier" ADD CONSTRAINT "HistoriqueDossier_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

