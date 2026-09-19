-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "lot" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "couleur" TEXT,
    "annee" INTEGER NOT NULL,
    "kilometrage" INTEGER,
    "energie" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "prix" DOUBLE PRECISION NOT NULL,
    "documentsDisponibles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteVehicule" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "acheteurId" TEXT NOT NULL,
    "acheteurEntreprise" TEXT,
    "acheteurTelephone" TEXT,
    "typeAchat" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'CONFIRME',
    "dossierId" TEXT,
    "assuranceDuree" TEXT,
    "destinationPays" TEXT,
    "destinationVille" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VenteVehicule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicule_lot_key" ON "Vehicule"("lot");

-- CreateIndex
CREATE INDEX "Vehicule_statut_idx" ON "Vehicule"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "VenteVehicule_reference_key" ON "VenteVehicule"("reference");

-- CreateIndex
CREATE INDEX "VenteVehicule_acheteurId_idx" ON "VenteVehicule"("acheteurId");

-- CreateIndex
CREATE INDEX "VenteVehicule_dossierId_idx" ON "VenteVehicule"("dossierId");

-- AddForeignKey
ALTER TABLE "VenteVehicule" ADD CONSTRAINT "VenteVehicule_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
