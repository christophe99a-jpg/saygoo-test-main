-- ============================================================================
-- Lot B8 : numero de recu
--
-- Attribue a la premiere emission du recu, puis conserve. L'index unique
-- garantit qu'un paiement n'a jamais deux recus differents en circulation.
-- Les valeurs NULL ne sont pas concernees par l'unicite : les paiements
-- sans recu cohabitent sans conflit.
-- ============================================================================

ALTER TABLE "Paiement" ADD COLUMN IF NOT EXISTS "numeroRecu" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Paiement_numeroRecu_key" ON "Paiement"("numeroRecu");
