-- CreateEnum
CREATE TYPE "StatutLivraison" AS ENUM ('EN_ATTENTE', 'ENLEVE', 'EN_TRANSIT', 'EN_LIVRAISON', 'LIVRE', 'ECHEC', 'RETOURNE');

-- CreateEnum
CREATE TYPE "TypeVehicule" AS ENUM ('CAMION', 'CAMIONNETTE', 'MOTO', 'BATEAU', 'AVION');

-- CreateTable
CREATE TABLE "Livraison" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "dossierId" TEXT,
    "dossierRef" TEXT,
    "clientId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTel" TEXT,
    "clientAdresse" TEXT,
    "transporteurId" TEXT,
    "transporteurNom" TEXT,
    "transporteurTel" TEXT,
    "typeVehicule" "TypeVehicule",
    "immatriculation" TEXT,
    "statut" "StatutLivraison" NOT NULL DEFAULT 'EN_ATTENTE',
    "adresseDepart" TEXT,
    "adresseArrivee" TEXT,
    "latitudeDepart" DOUBLE PRECISION,
    "longitudeDepart" DOUBLE PRECISION,
    "latitudeArrivee" DOUBLE PRECISION,
    "longitudeArrivee" DOUBLE PRECISION,
    "latitudeActuelle" DOUBLE PRECISION,
    "longitudeActuelle" DOUBLE PRECISION,
    "dateEnlevement" TIMESTAMP(3),
    "dateLivraisonPrevue" TIMESTAMP(3),
    "dateLivraisonReelle" TIMESTAMP(3),
    "preuveLivraison" TEXT,
    "notes" TEXT,
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionGPS" (
    "id" TEXT NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "vitesse" DOUBLE PRECISION,
    "cap" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionGPS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueLivraison" (
    "id" TEXT NOT NULL,
    "livraisonId" TEXT NOT NULL,
    "statut" "StatutLivraison" NOT NULL,
    "description" TEXT,
    "userId" TEXT,
    "userNom" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueLivraison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Livraison_reference_key" ON "Livraison"("reference");

-- CreateIndex
CREATE INDEX "Livraison_clientId_idx" ON "Livraison"("clientId");

-- CreateIndex
CREATE INDEX "Livraison_dossierId_idx" ON "Livraison"("dossierId");

-- CreateIndex
CREATE INDEX "Livraison_statut_idx" ON "Livraison"("statut");

-- CreateIndex
CREATE INDEX "Livraison_reference_idx" ON "Livraison"("reference");

-- CreateIndex
CREATE INDEX "PositionGPS_livraisonId_idx" ON "PositionGPS"("livraisonId");

-- CreateIndex
CREATE INDEX "PositionGPS_createdAt_idx" ON "PositionGPS"("createdAt");

-- CreateIndex
CREATE INDEX "HistoriqueLivraison_livraisonId_idx" ON "HistoriqueLivraison"("livraisonId");

-- AddForeignKey
ALTER TABLE "PositionGPS" ADD CONSTRAINT "PositionGPS_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "Livraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueLivraison" ADD CONSTRAINT "HistoriqueLivraison_livraisonId_fkey" FOREIGN KEY ("livraisonId") REFERENCES "Livraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;
