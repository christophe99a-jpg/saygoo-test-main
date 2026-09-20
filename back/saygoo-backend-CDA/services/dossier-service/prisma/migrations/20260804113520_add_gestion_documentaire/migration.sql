-- CreateEnum
CREATE TYPE "DocumentStatut" AS ENUM ('DEPOSE', 'VALIDE', 'SIGNE', 'REJETE');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "archive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archiveAt" TIMESTAMP(3),
ADD COLUMN     "motifRejet" TEXT,
ADD COLUMN     "signeAt" TIMESTAMP(3),
ADD COLUMN     "signePar" TEXT,
ADD COLUMN     "statut" "DocumentStatut" NOT NULL DEFAULT 'DEPOSE',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "DocumentHistorique" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "userNom" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentHistorique_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentHistorique_documentId_idx" ON "DocumentHistorique"("documentId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "Document_statut_idx" ON "Document"("statut");

-- AddForeignKey
ALTER TABLE "DocumentHistorique" ADD CONSTRAINT "DocumentHistorique_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
