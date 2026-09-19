-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CDA', 'CONSIGNATAIRE', 'OPERATEUR_ECONOMIQUE', 'GESTIONNAIRE_ENTREPOT', 'TRANSPORTEUR', 'COMPTABLE', 'MANAGER');

-- CreateEnum
CREATE TYPE "StatutCompte" AS ENUM ('EN_ATTENTE_VALIDATION', 'ACTIF', 'SUSPENDU', 'DESACTIVE');

-- CreateEnum
CREATE TYPE "TypeJeton" AS ENUM ('VERIFICATION_EMAIL', 'REINITIALISATION_MDP');

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasseHash" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL,
    "statut" "StatutCompte" NOT NULL DEFAULT 'EN_ATTENTE_VALIDATION',
    "organisationId" TEXT,
    "raisonSociale" TEXT,
    "emailVerifie" BOOLEAN NOT NULL DEFAULT false,
    "derniereConnexion" TIMESTAMP(3),
    "twoFactorActive" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "tentativesEchouees" INTEGER NOT NULL DEFAULT 0,
    "verrouilleJusqua" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "revoque" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "adresseIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JetonUsage" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TypeJeton" NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "expireAt" TIMESTAMP(3) NOT NULL,
    "utilise" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JetonUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalAuth" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "email" TEXT,
    "action" TEXT NOT NULL,
    "succes" BOOLEAN NOT NULL DEFAULT true,
    "adresseIp" TEXT,
    "userAgent" TEXT,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_email_idx" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE INDEX "Utilisateur_statut_idx" ON "Utilisateur"("statut");

-- CreateIndex
CREATE INDEX "Utilisateur_organisationId_idx" ON "Utilisateur"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_utilisateurId_idx" ON "RefreshToken"("utilisateurId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "JetonUsage_token_key" ON "JetonUsage"("token");

-- CreateIndex
CREATE INDEX "JetonUsage_token_idx" ON "JetonUsage"("token");

-- CreateIndex
CREATE INDEX "JetonUsage_utilisateurId_idx" ON "JetonUsage"("utilisateurId");

-- CreateIndex
CREATE INDEX "JournalAuth_utilisateurId_idx" ON "JournalAuth"("utilisateurId");

-- CreateIndex
CREATE INDEX "JournalAuth_action_idx" ON "JournalAuth"("action");

-- CreateIndex
CREATE INDEX "JournalAuth_createdAt_idx" ON "JournalAuth"("createdAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JetonUsage" ADD CONSTRAINT "JetonUsage_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;
