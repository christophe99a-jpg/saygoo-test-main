-- CreateEnum
CREATE TYPE "StatutCotation" AS ENUM ('PROVISOIRE', 'VALIDEE', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE');

-- CreateEnum
CREATE TYPE "TypeMarchandise" AS ENUM ('CONTENEUR_20', 'CONTENEUR_40', 'VRAC', 'VEHICULE', 'COLIS', 'AUTRE');

-- CreateEnum
CREATE TYPE "RegimeDouanier" AS ENUM ('IM4', 'IM7', 'TRANSIT', 'REGIME_SUSPENSIF', 'EXPORT');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CATEGORIE_A', 'CATEGORIE_B', 'CATEGORIE_C');

-- CreateEnum
CREATE TYPE "DeviseCode" AS ENUM ('XOF', 'EUR', 'USD', 'GBP');

-- CreateTable
CREATE TABLE "Cotation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentNom" TEXT NOT NULL,
    "statut" "StatutCotation" NOT NULL DEFAULT 'PROVISOIRE',
    "typeMarchandise" "TypeMarchandise" NOT NULL,
    "regimeDouanier" "RegimeDouanier" NOT NULL DEFAULT 'IM4',
    "typeVehicule" "TypeVehicule",
    "devise" "DeviseCode" NOT NULL DEFAULT 'XOF',
    "valeurFOB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valeurFret" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valeurAssurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valeurCIF" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxDouane" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "droitsDouane" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "montantTVA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxRS" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "montantRS" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tauxTSP" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "montantTSP" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDroitsTaxes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "honorairesCDA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "modeCalculCDA" TEXT NOT NULL DEFAULT 'FORFAIT',
    "fraisConsignataire" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisTransport" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisStockage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraisManutention" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autresFrais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFrais" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGeneral" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nombreConteneurs" INTEGER NOT NULL DEFAULT 1,
    "nombreVehicules" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "dateExpiration" TIMESTAMP(3),
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCotation" (
    "id" TEXT NOT NULL,
    "cotationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "categorie" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneCotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifDouanier" (
    "id" TEXT NOT NULL,
    "codeHS" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tauxDouane" DOUBLE PRECISION NOT NULL,
    "tauxTVA" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "tauxRS" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "tauxTSP" DOUBLE PRECISION NOT NULL DEFAULT 0.005,
    "unite" TEXT NOT NULL DEFAULT 'ad valorem',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifDouanier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TauxChange" (
    "id" TEXT NOT NULL,
    "devise" TEXT NOT NULL,
    "tauxVersXOF" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BCEAO',
    "dateRapport" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TauxChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cotation_reference_key" ON "Cotation"("reference");

-- CreateIndex
CREATE INDEX "Cotation_clientId_idx" ON "Cotation"("clientId");

-- CreateIndex
CREATE INDEX "Cotation_dossierId_idx" ON "Cotation"("dossierId");

-- CreateIndex
CREATE INDEX "Cotation_statut_idx" ON "Cotation"("statut");

-- CreateIndex
CREATE INDEX "LigneCotation_cotationId_idx" ON "LigneCotation"("cotationId");

-- CreateIndex
CREATE UNIQUE INDEX "TarifDouanier_codeHS_key" ON "TarifDouanier"("codeHS");

-- CreateIndex
CREATE INDEX "TarifDouanier_codeHS_idx" ON "TarifDouanier"("codeHS");

-- CreateIndex
CREATE INDEX "TauxChange_devise_idx" ON "TauxChange"("devise");

-- AddForeignKey
ALTER TABLE "LigneCotation" ADD CONSTRAINT "LigneCotation_cotationId_fkey" FOREIGN KEY ("cotationId") REFERENCES "Cotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
