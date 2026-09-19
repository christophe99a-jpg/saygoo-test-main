-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "zone" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "photoUrl" TEXT,
    "gravite" TEXT NOT NULL DEFAULT 'JAUNE',
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "warehouseId" TEXT,
    "declarePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resoluAt" TIMESTAMP(3),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_reference_key" ON "Incident"("reference");

-- CreateIndex
CREATE INDEX "Incident_statut_idx" ON "Incident"("statut");

-- CreateIndex
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- CreateIndex
CREATE INDEX "Incident_reference_idx" ON "Incident"("reference");
