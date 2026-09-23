-- ============================================================================
-- Suivi d'un paiement par une autre organisation
--
-- organisationId           organisation du client qui paie (son CLN)
-- suiviParOrganisationId   organisation qui suit le paiement pour lui,
--                          typiquement le CDA qui l'a initie
--
-- Chacun voit les paiements ou son organisation apparait dans l'un ou
-- l'autre champ.
-- ============================================================================

ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "suiviParOrganisationId" TEXT;

CREATE INDEX IF NOT EXISTS "Paiement_suiviParOrganisationId_idx"
  ON "Paiement"("suiviParOrganisationId");
