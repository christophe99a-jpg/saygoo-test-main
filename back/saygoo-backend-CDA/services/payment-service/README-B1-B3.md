# Lot B1-B3 — Statuts, methodes et references de paiement

## Ce qui change

### B3 — Huit statuts au lieu de six

Le cahier des charges definit un cycle de vie precis :

    CREE -> INITIE -> EN_ATTENTE_CONFIRMATION -> CONFIRME -> RAPPROCHE
                                                    |
                            ECHEC | REMBOURSEMENT_DEMANDE | ANNULE

| Ancien | Nouveau | Pourquoi |
|---|---|---|
| EN_ATTENTE | CREE | le paiement existe, rien n'est parti |
| EN_COURS | INITIE | la demande est partie chez le prestataire |
| SUCCES | CONFIRME | encaisse, mais pas encore rapproche |
| ECHEC | ECHEC | inchange |
| REMBOURSE | REMBOURSEMENT_DEMANDE | vocabulaire du cahier des charges |
| ANNULE | ANNULE | inchange |
| — | **EN_ATTENTE_CONFIRMATION** | nouveau |
| — | **RAPPROCHE** | nouveau |

**RAPPROCHE est le statut qui compte.** Il distingue un encaissement d'un
paiement rattache a sa facture, son dossier et son conteneur. C'est lui qui
fait du CLN un outil de controle financier plutot qu'un journal de
transactions.

Six colonnes accompagnent ce rapprochement : `conteneurNum`, `serviceRendu`,
`prestataire`, `rapprochePar`, `rapprocheLe` et `dlnuRef`.

### Machine a etats

`src/services/paiement.etats.js` declare les transitions autorisees. Toute
transition absente de la table est refusee. Consequence concrete : un webhook
PayGate qui arrive en retard ne peut plus faire repasser a ECHEC un paiement
que le comptable a deja rapproche.

Deux notions y sont distinguees :

- **terminal** : plus aucune transition (ECHEC, REMBOURSEMENT_DEMANDE, ANNULE).
  La liste se deduit de la table, elle n'est pas ecrite a la main.
- **fige pour les webhooks** : les terminaux plus RAPPROCHE. Le comptable peut
  encore rembourser ; le prestataire ne peut plus rien.

### B4 — Quatre methodes

Le cahier des charges n'en retient que quatre : virement bancaire et VISA
Business via Ecobank, Flooz et T-Money via PayGate Global.

`ESPECES`, `CARTE_BANCAIRE`, `WAVE` et `MOBILE_MONEY` sont retires. Cela
aligne `MethodePaiement` sur `MethodeInstruction`, qui utilisait deja les
bonnes valeurs.

### B1-B2 — References

Format du cahier des charges : `SAY-PAY-20260914-00087`, avec une
numerotation qui repart de 1 chaque jour.

La numerotation passe par une sequence PostgreSQL. L'ancien `count() + 1`
n'etait pas sur : deux paiements crees dans la meme milliseconde lisaient
le meme comptage et produisaient la meme reference.

Les references existantes au format `PAY-2026-000001` **ne sont pas
reecrites** : une reference est un identifiant, la changer romprait les
liens vers les recus deja emis. Seules les nouvelles suivent le format.

## Installation

    cd back\saygoo-backend-CDA\services\payment-service
    tar -xf "%USERPROFILE%\Downloads\saygoo-B1-B3-payment.zip" --strip-components=1 payment-B1-B3
    npm test
    npx prisma migrate deploy
    npx prisma generate
    npm run dev

`migrate deploy` plutot que `migrate dev` : la migration est deja ecrite,
il ne faut pas que Prisma en genere une autre.

## La migration

Elle a ete executee sur un PostgreSQL 16 reel, avec un jeu de donnees
couvrant les six anciens statuts. Les six traductions sont verifiees, les
anciens types supprimes sans orphelin, le defaut repositionne sur CREE.

**Garde-fou.** PostgreSQL ne sait pas retirer une valeur d'un enum. La
migration cree un nouveau type et y convertit la colonne. Si elle rencontre
des paiements en ESPECES, CARTE_BANCAIRE, WAVE ou MOBILE_MONEY, elle
**s'arrete** avec un message explicite plutot que de choisir a votre place
— MOBILE_MONEY est ambigu, Flooz ou T-Money ?

Ce cas a ete teste : la migration refuse, et la base reste intacte.

Ta base `saygoo_payment` est vide, donc le garde-fou ne se declenchera pas.

## Reste du lot B

- **B5-B6** : Ecobank et PayGate. `traduireStatutPrestataire()` est prete a
  les accueillir ; il manque la documentation technique des deux prestataires.
- **B7** : timeline. `TentativePaiement` stocke deja les evenements, il
  manque l'endpoint qui les expose.
- **B8** : recu PDF avec QR de verification.
- **B9** : rapprochement automatique, qui depend du DLNU (lot D).
- **B10** : paiement fractionne 70/30.

## A cabler ensuite

`paiement.etats.js` n'est pas encore utilise par `payment.controller.js`.
Le controleur manipule toujours les statuts en dur. Le brancher est l'etape
suivante, et elle merite ses propres tests : c'est la que la machine a etats
prendra effet.
