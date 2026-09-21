# Lot B (B1 a B4 et B7) — Paiements branches sur la machine a etats

**Ce paquet remplace `saygoo-B1-B3-payment.zip`.** Ne pas installer
l'ancien seul : il modifiait le schema sans modifier le controleur, qui
aurait continue d'ecrire des statuts supprimes. Prisma aurait leve une
erreur a chaque paiement.

Si tu as deja installe B1-B3 seul, installe celui-ci par-dessus : il le
contient integralement.

## Contenu

| Fichier | Role |
|---|---|
| `prisma/schema.prisma` | 8 statuts, 4 methodes, 6 champs de rapprochement |
| `prisma/migrations/.../migration.sql` | conversion des donnees, testee sur PostgreSQL 16 |
| `src/services/paiement.etats.js` | machine a etats et references SAY-PAY |
| `src/controllers/payment.controller.js` | controleur branche sur la machine a etats |
| `src/routes/payment.routes.js` | 3 routes ajoutees |
| `src/utils/reference.js` | meme API, delegue aux sequences |
| `tests/*` | 66 tests |

## Le principe : une seule porte pour changer de statut

Aucun controleur n'ecrit plus `statut` directement. Tout passe par
`appliquerTransition()`, qui :

1. valide la transition aupres de la machine a etats ;
2. ecrit le nouveau statut **et** la ligne de timeline dans la meme
   transaction.

Consequence : la timeline est complete par construction. Il est impossible
de changer un statut sans laisser de trace.

## Nouvelles routes

| Route | Role | Droits |
|---|---|---|
| `PATCH /paiements/:id/rapprocher` | CONFIRME -> RAPPROCHE | COMPTABLE |
| `PATCH /paiements/:id/rembourser` | vers REMBOURSEMENT_DEMANDE | COMPTABLE |
| `GET /paiements/:id/timeline` | historique (lot B7) | authentifie |

Le rapprochement exige au moins une facture ou un dossier : un paiement
rapproche a rien n'aurait pas de sens.

## Comportements qui changent

**Annuler un paiement confirme est desormais refuse (409).** L'argent est
encaisse : on rembourse, on n'annule pas. L'ancien code l'interdisait deja
pour SUCCES ; la regle est maintenant portee par la machine a etats.

**Le Mobile Money passe directement en attente de confirmation.** Flooz et
T-Money suivent CREE -> INITIE -> EN_ATTENTE_CONFIRMATION, car le client doit
valider sur son telephone. Le virement et VISA s'arretent a INITIE.

**Le webhook ne devine plus.** Un statut prestataire inconnu est trace et
ignore, sans rien modifier. L'ancien code transformait tout ce qui n'etait
pas `SUCCESS` en echec, y compris un simple `PENDING`.

**Les statistiques distinguent encaisse et a rapprocher.** « Encaisse »
regroupe CONFIRME et RAPPROCHE ; « a rapprocher » isole les CONFIRME, qui
forment la file de travail du comptable.

**Plus aucune fuite d'erreur.** Les 7 `err.message` restants du controleur
sont neutralises.

## compte.controller.js n'est pas modifie

`utils/reference.js` garde ses noms historiques mais delegue aux sequences.
Le controleur des comptes produit donc desormais des `SAY-INS-...` sans
avoir ete touche, et beneficie de la correction du `count() + 1`.

## Installation

    cd back\saygoo-backend-CDA\services\payment-service
    tar -xf "%USERPROFILE%\Downloads\saygoo-lot-B-payment.zip" --strip-components=1 payment-lot-B
    npm test
    npx prisma migrate deploy
    npx prisma generate
    npm run dev

`migrate deploy` et non `migrate dev` : la migration est ecrite, Prisma ne
doit pas en generer une autre.

Puis versionner :

    git add -A
    git commit -m "Lot B : 8 statuts, machine a etats, rapprochement, timeline"
    git push

## Reste du lot B

- **B5-B6** : Ecobank et PayGate. Il manque leur documentation technique.
- **B8** : recu PDF avec QR de verification.
- **B9** : rapprochement automatique, qui depend du DLNU (lot D).
- **B10** : paiement fractionne 70/30.
