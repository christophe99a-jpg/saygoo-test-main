-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "StatutNotification" AS ENUM ('EN_ATTENTE', 'ENVOYEE', 'ECHEC', 'LUE');

-- CreateEnum
CREATE TYPE "PrioriteNotification" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "statut" "StatutNotification" NOT NULL DEFAULT 'EN_ATTENTE',
    "priorite" "PrioriteNotification" NOT NULL DEFAULT 'NORMALE',
    "destinataire" TEXT NOT NULL,
    "sujet" TEXT,
    "contenu" TEXT NOT NULL,
    "metadata" JSONB,
    "userId" TEXT,
    "dossierId" TEXT,
    "factureId" TEXT,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "maxTentatives" INTEGER NOT NULL DEFAULT 3,
    "erreur" TEXT,
    "luAt" TIMESTAMP(3),
    "envoyeAt" TIMESTAMP(3),
    "organisationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "sujet" TEXT,
    "contenu" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_statut_idx" ON "Notification"("statut");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Template_code_key" ON "Template"("code");

-- CreateIndex
CREATE INDEX "Template_code_idx" ON "Template"("code");
