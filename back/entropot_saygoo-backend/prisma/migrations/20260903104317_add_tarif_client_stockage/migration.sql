-- AlterTable
ALTER TABLE "DemandeStockageEntrepot" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "contactTelephone" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "capaciteEVP20" INTEGER,
ADD COLUMN     "tarifStockageParTonneJour" DOUBLE PRECISION;
