-- ============================================================================
-- Rattachement des comptes existants a une organisation
--
-- Aucun compte n'avait d'organisation : l'inscription ne remplissait jamais
-- le champ. Le Compte Logistique Numerique et l'isolation des donnees entre
-- societes en dependent.
--
-- Regle retenue : chaque compte metier est sa propre organisation
-- (organisationId = id). Le jour ou une societe aura plusieurs utilisateurs
-- partageant un meme CLN, une table Organisation remplacera cette convention.
--
-- Le personnel SAYGOO (SUPER_ADMIN, ADMIN, COMPTABLE, MANAGER) reste sans
-- organisation : il voit les donnees de toutes les societes.
--
-- Les comptes qui avaient deja une organisation ne sont pas modifies.
-- ============================================================================

UPDATE "Utilisateur"
SET "organisationId" = "id"
WHERE "organisationId" IS NULL
  AND "role" NOT IN ('SUPER_ADMIN', 'ADMIN', 'COMPTABLE', 'MANAGER');
