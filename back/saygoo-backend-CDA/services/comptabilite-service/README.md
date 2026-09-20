# SAYGOO — Service de comptabilité

Référentiel : **SYSCOHADA révisé (AUDCIF 2017)**, en vigueur dans les 17 États
OHADA depuis le 1er janvier 2018.

Port : **3003** — Base : **saygoo_comptabilite**

## Installation

```
npm install
copy .env.exemple .env          (puis renseigner DATABASE_URL et JWT_ACCESS_SECRET)
npx prisma generate
npx prisma migrate dev --name init_comptabilite
npm run seed
npm test
npm run dev
```

Le `JWT_ACCESS_SECRET` doit être **identique** à celui des 10 autres services,
sinon l'authentification centralisée échoue.

## Principes comptables appliqués

- **Partie double stricte** : toute écriture équilibre débit et crédit, contrôlé
  à la création et revérifié à la validation.
- **Immuabilité** : une écriture validée ne se modifie ni ne se supprime. La
  correction passe par une extourne, qui laisse les deux traces au journal.
- **Rattachement à l'exercice** : aucune écriture sur un exercice clôturé, et
  aucune clôture tant qu'il reste des brouillons.
- **Numérotation atomique** : séquences PostgreSQL par journal et par exercice
  (VE-2026-000001), et non un `count() + 1` qui produirait des doublons.

## Endpoints

| Méthode | Route | Rôle minimal |
|---|---|---|
| GET | `/comptabilite/comptes` | CDA |
| POST | `/comptabilite/comptes` | COMPTABLE |
| DELETE | `/comptabilite/comptes/:numero` | COMPTABLE |
| GET | `/comptabilite/journaux` | CDA |
| GET | `/comptabilite/exercices` | CDA |
| POST | `/comptabilite/exercices` | COMPTABLE |
| POST | `/comptabilite/exercices/:annee/cloturer` | COMPTABLE |
| GET | `/comptabilite/ecritures` | CDA |
| POST | `/comptabilite/ecritures` | COMPTABLE |
| GET | `/comptabilite/ecritures/:id` | CDA |
| DELETE | `/comptabilite/ecritures/:id` | COMPTABLE (brouillon seul) |
| POST | `/comptabilite/ecritures/:id/valider` | COMPTABLE |
| POST | `/comptabilite/ecritures/:id/extourner` | COMPTABLE |
| GET | `/comptabilite/balance` | CDA |
| GET | `/comptabilite/balance-agee` | CDA |
| GET | `/comptabilite/grand-livre/:numero` | CDA |
| GET | `/comptabilite/journal/:code` | CDA |
| GET | `/comptabilite/export/ecritures` | CDA |
| GET/POST | `/comptabilite/ajustements` | CDA |
| POST | `/comptabilite/ajustements/:id/valider` | COMPTABLE |
| POST | `/comptabilite/ajustements/:id/rejeter` | COMPTABLE |

## Reste à faire

- Transmission du crédit d'ajustement au CLN (champ `clnNotifie`, dépend du lot B)
- Génération automatique d'écritures depuis `facturation-service` et `payment-service`
- États financiers annuels (bilan, compte de résultat) si le comptable en a besoin
- Le plan de comptes du seed est une base à compléter : l'Acte uniforme impose
  qu'il soit « suffisamment détaillé pour permettre l'enregistrement des opérations »
