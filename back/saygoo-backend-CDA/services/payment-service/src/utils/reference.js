/**
 * Compatibilité : les noms historiques sont conservés pour ne pas modifier
 * compte.controller.js, mais délèguent désormais aux séquences PostgreSQL.
 *
 * L'ancienne implémentation reposait sur `count() + 1`, qui produisait des
 * références en double dès que deux opérations étaient simultanées.
 * Nouveau format : SAY-PAY-AAAAMMJJ-NNNNN et SAY-INS-AAAAMMJJ-NNNNN.
 */
const {
  genererReferencePaiement,
  genererReferenceInstruction
} = require('../services/paiement.etats');

module.exports = {
  generateReference: genererReferencePaiement,
  generateInstructionReference: genererReferenceInstruction
};
