-- CreateEnum
CREATE TYPE "TypeFormalite" AS ENUM ('IMPORT', 'TRANSIT');

-- AlterTable
ALTER TABLE "Dossier" ADD COLUMN     "destinationPays" TEXT,
ADD COLUMN     "destinationVille" TEXT,
ADD COLUMN     "vin" TEXT;

-- CreateTable
CREATE TABLE "FormaliteDossier" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "type" "TypeFormalite" NOT NULL,
    "libelle" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "completeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormaliteDossier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormaliteDossier_dossierId_idx" ON "FormaliteDossier"("dossierId");

-- AddForeignKey
ALTER TABLE "FormaliteDossier" ADD CONSTRAINT "FormaliteDossier_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "Dossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
