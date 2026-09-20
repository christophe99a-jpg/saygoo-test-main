# A4 — dossier-service

## Trois corrections

### 1. Doublon de montage (le point signale)

`src/index.js` montait `documentRoutes` deux fois, lignes 44 et 50, avec
`fichierRoutes` intercale. Cela fonctionnait par chance : aucune route ne se
recouvrait. Le premier `POST /documents/upload` ajoute a `documentRoutes`
aurait masque silencieusement celui de `fichierRoutes`, et l'upload aurait
cesse de fonctionner sans message d'erreur.

Le montage en double est supprime. L'ordre `fichierRoutes` puis
`documentRoutes` est conserve et commente, car c'est lui qui garantit que
`/documents/upload` reste atteignable.

### 2. Fuites d'information (71 occurrences)

Chaque bloc `catch` renvoyait `err.message` au client :

    return res.status(500).json({ success: false, message: err.message });

Une erreur Prisma expose les noms de tables, de colonnes et de contraintes.
Les 71 reponses 500 renvoient desormais un message generique ; le detail
complet reste dans les logs.

Une occurrence a ete conservee volontairement :
`fichier.controller.js:251` renvoie un 400 portant le message du filtre de
format de fichier, destine a l'utilisateur.

### 3. Numerotation non concurrente (6 generateurs)

`count() + 1` n'est pas sur : deux requetes simultanees lisent le meme
comptage et produisent la meme reference.

| Fichier | Reference |
|---|---|
| `utils/reference.js` | `DD-AAAA-NNNNNN` |
| `controllers/stockage.controller.js` | `ST-AAAA-NNNNNN` |
| `controllers/transport.controller.js` | `TR-AAAA-NNNNNN` |
| `controllers/vente.controller.js` | `ACH-AAAA-NNNNNN` et `DD-AAAA-NNNNNN` |
| `controllers/catalogue.controller.js` | `VNNN` (lot vehicule) |

Tous passent par `utils/sequence.js`, nouveau fichier partage.

**Point important** : la base contient deja 9 dossiers `DD-2026-00000X`.
Une sequence neuve repartirait de 1 et produirait des collisions. A sa
premiere utilisation seulement, elle se cale donc sur le plus grand numero
existant. Le test « s'amorce sur le maximum existant » couvre ce cas.

## Installation

    cd back\saygoo-backend-CDA\services\dossier-service
    npm install --ignore-scripts
    npm test

11 tests, aucune base requise.

Contrairement aux services precedents, `index.js` reste le point d'entree :
les tests portent sur `utils/sequence.js`, qui n'a pas besoin de l'application
Express. La scission `app.js` / `server.js` pourra se faire plus tard, quand
on voudra tester les endpoints eux-memes.

## Verification apres demarrage

Creer un dossier et confirmer que sa reference suit les existantes :

    psql -U saygoo -d saygoo_dossiers -c "SELECT reference FROM \"Dossier\" ORDER BY reference DESC LIMIT 3"

La nouvelle doit etre DD-2026-000010 ou au-dela, jamais un numero deja pris.
