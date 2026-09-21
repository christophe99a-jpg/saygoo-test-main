-- ============================================================================
-- Lot B1-B3 : huit statuts, quatre methodes, champs de rapprochement
--
-- PostgreSQL ne sait pas retirer une valeur d'un type enum. La seule voie
-- sure est de creer un nouveau type, d'y convertir la colonne en traduisant
-- les anciennes valeurs, puis de supprimer l'ancien type.
--
-- Cette migration est ecrite pour etre rejouable sans perte : elle refuse
-- de s'executer plutot que de deviner, si elle rencontre des donnees
-- qu'elle ne sait pas traduire.
-- ============================================================================

-- ─── 1. Garde-fou sur les methodes intraduisibles ───────────────────────────
-- ESPECES, CARTE_BANCAIRE, WAVE et MOBILE_MONEY disparaissent du referentiel.
-- Les trois premieres n'ont pas d'equivalent ; MOBILE_MONEY est ambigu
-- (Flooz ou T-Money ?). Plutot que de choisir a la place du comptable,
-- la migration s'arrete et demande un arbitrage.

DO $$
DECLARE
  nb integer;
BEGIN
  SELECT COUNT(*) INTO nb
  FROM "Paiement"
  WHERE "methode"::text IN ('ESPECES', 'CARTE_BANCAIRE', 'WAVE', 'MOBILE_MONEY');

  IF nb > 0 THEN
    RAISE EXCEPTION
      'Migration interrompue : % paiement(s) utilisent une methode supprimee '
      '(ESPECES, CARTE_BANCAIRE, WAVE ou MOBILE_MONEY). '
      'Reaffectez-les a VIREMENT_BANCAIRE, VISA_BUSINESS, FLOOZ ou TMONEY, '
      'puis relancez la migration.', nb;
  END IF;
END $$;

-- ─── 2. Nouveau type de statut ──────────────────────────────────────────────

CREATE TYPE "StatutPaiement_nouveau" AS ENUM (
  'CREE',
  'INITIE',
  'EN_ATTENTE_CONFIRMATION',
  'CONFIRME',
  'RAPPROCHE',
  'ECHEC',
  'REMBOURSEMENT_DEMANDE',
  'ANNULE'
);

-- Le defaut doit etre retire avant la conversion : il reference l'ancien type.
ALTER TABLE "Paiement" ALTER COLUMN "statut" DROP DEFAULT;

-- Traduction des anciennes valeurs vers les nouvelles.
--   EN_ATTENTE -> CREE          : le paiement existe, rien n'est parti
--   EN_COURS   -> INITIE        : la demande est partie chez le prestataire
--   SUCCES     -> CONFIRME      : encaisse mais pas encore rapproche
--   REMBOURSE  -> REMBOURSEMENT_DEMANDE
ALTER TABLE "Paiement"
  ALTER COLUMN "statut" TYPE "StatutPaiement_nouveau"
  USING (
    CASE "statut"::text
      WHEN 'EN_ATTENTE' THEN 'CREE'
      WHEN 'EN_COURS'   THEN 'INITIE'
      WHEN 'SUCCES'     THEN 'CONFIRME'
      WHEN 'ECHEC'      THEN 'ECHEC'
      WHEN 'REMBOURSE'  THEN 'REMBOURSEMENT_DEMANDE'
      WHEN 'ANNULE'     THEN 'ANNULE'
    END
  )::"StatutPaiement_nouveau";

DROP TYPE "StatutPaiement";
ALTER TYPE "StatutPaiement_nouveau" RENAME TO "StatutPaiement";

ALTER TABLE "Paiement" ALTER COLUMN "statut" SET DEFAULT 'CREE';

-- ─── 3. Nouveau type de methode ─────────────────────────────────────────────

CREATE TYPE "MethodePaiement_nouveau" AS ENUM (
  'VIREMENT_BANCAIRE',
  'VISA_BUSINESS',
  'FLOOZ',
  'TMONEY'
);

ALTER TABLE "Paiement"
  ALTER COLUMN "methode" TYPE "MethodePaiement_nouveau"
  USING ("methode"::text)::"MethodePaiement_nouveau";

DROP TYPE "MethodePaiement";
ALTER TYPE "MethodePaiement_nouveau" RENAME TO "MethodePaiement";

-- ─── 4. Champs de rapprochement ─────────────────────────────────────────────
-- Ce sont eux qui relient un encaissement a la chaine complete
-- Client / Dossier / Conteneur / Service / Facture / Prestataire.

ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "conteneurNum" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "serviceRendu" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "prestataire"  TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "rapprochePar" TEXT;
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "rapprocheLe"  TIMESTAMP(3);
ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "dlnuRef"      TEXT;

CREATE INDEX IF NOT EXISTS "Paiement_dlnuRef_idx"      ON "Paiement"("dlnuRef");
CREATE INDEX IF NOT EXISTS "Paiement_conteneurNum_idx" ON "Paiement"("conteneurNum");

-- ─── 5. Anciennes references ────────────────────────────────────────────────
-- Les references au format PAY-2026-000001 restent telles quelles :
-- une reference est un identifiant, la reecrire romprait les liens vers
-- les recus deja emis. Seules les nouvelles suivent SAY-PAY-AAAAMMJJ-NNNNN.
-- Le format est verifiable par referenceValide() dans paiement.etats.js.
