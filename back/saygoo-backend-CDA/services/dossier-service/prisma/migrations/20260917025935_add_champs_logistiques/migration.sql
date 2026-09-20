-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "co2EstimeKg" DOUBLE PRECISION,
ADD COLUMN     "codeHS" TEXT,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "lienGeolocalisation" TEXT,
ADD COLUMN     "modePaiement" TEXT,
ADD COLUMN     "modeTransport" TEXT,
ADD COLUMN     "nombreConteneurs" INTEGER,
ADD COLUMN     "paiementFractionne" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "servicesGMS" TEXT[];

-- CreateIndex
CREATE INDEX "Dossier_codeHS_idx" ON "Dossier"("codeHS");
