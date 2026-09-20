# A5a — Consignataire : sortir de `synchronize: true`

## Le problème

`src/app.module.ts` configurait TypeORM avec `synchronize: true`. À chaque
démarrage, TypeORM comparait les entités au schéma réel et le modifiait pour
les aligner.

C'est commode au prototypage et dangereux ensuite. TypeORM ne voit pas les
intentions : il voit un état de départ et un état d'arrivée. Renommer
`montant` en `montantTotal` est compris comme « colonne `montant` supprimée,
colonne `montantTotal` créée ». La colonne est effectivement supprimée, avec
son contenu, sans question ni avertissement.

Ta base contient désormais des données réelles. Le risque est devenu concret.

## Ce qui change

| Avant | Après |
|---|---|
| `synchronize: true` | `synchronize: false` |
| Schéma modifié au démarrage, en silence | Migrations explicites, relues, versionnées |
| Aucune trace des changements | Un fichier daté par changement, dans git |
| Retour arrière impossible | `migration:revert` |

Trois fichiers : `src/data-source.ts` (nouveau, pour la CLI),
`src/app.module.ts` (modifié) et `package.json` (6 scripts ajoutés).

## Installation

    cd back\saygoo-backend-cngtaire
    tar -xf "%USERPROFILE%\Downloads\saygoo-A5a-cngtaire.zip" --strip-components=1 cngtaire-A5a
    npm install --ignore-scripts

## Créer la migration de référence

Ta base est déjà au bon schéma, mais l'historique des migrations est vide.
Il faut donc une migration initiale décrivant le schéma complet, puis la
déclarer comme déjà appliquée. Sans elle, un nouveau poste ou un serveur
neuf n'aurait aucun moyen de recréer les tables.

### 1. Générer depuis une base vide

`migration:generate` compare les entités à la base réelle. Sur ta base
actuelle, la comparaison ne donnerait rien, puisqu'elles concordent déjà.
On génère donc contre une base vide pour obtenir le schéma complet.

    set PGPASSWORD=root
    psql -U saygoo -c "CREATE DATABASE consignataire_baseline"
    set PGPASSWORD=

Dans `.env`, remplacer temporairement :

    DB_NAME=consignataire_baseline

Puis :

    npm run migration:generate -- src/migrations/SchemaInitial

Un fichier `src/migrations/<horodatage>-SchemaInitial.ts` apparaît, contenant
les `CREATE TABLE` des 10 tables.

**Remettre `DB_NAME=consignataire_db` dans `.env` immédiatement.**

### 2. Déclarer la migration comme déjà appliquée

Sur la vraie base, les tables existent : rejouer la migration échouerait.
On inscrit donc son passage dans l'historique sans l'exécuter.

Relever l'horodatage au début du nom du fichier généré, par exemple
`1758300000000-SchemaInitial.ts`, puis :

    set PGPASSWORD=root
    psql -U saygoo -d consignataire_db -c "CREATE TABLE IF NOT EXISTS migrations (id SERIAL PRIMARY KEY, timestamp bigint NOT NULL, name varchar NOT NULL)"
    psql -U saygoo -d consignataire_db -c "INSERT INTO migrations (timestamp, name) VALUES (1758300000000, 'SchemaInitial1758300000000')"
    set PGPASSWORD=

Attention au nom : TypeORM attend `<NomDeClasse><horodatage>`, sans tiret.
La classe figure dans le fichier généré (`export class SchemaInitial1758300000000`).
Recopier ce nom exactement.

### 3. Vérifier

    npm run migration:show

La migration doit apparaître cochée `[X]`, donc appliquée. Puis :

    npm run start:dev

Le service démarre sans rien modifier au schéma.

### 4. Supprimer la base temporaire

    set PGPASSWORD=root
    psql -U saygoo -c "DROP DATABASE consignataire_baseline"
    set PGPASSWORD=

## Alternative plus simple

Si ces étapes te paraissent lourdes, il existe un chemin direct : supprimer
les tables et laisser la migration les recréer proprement.

Tu perdrais le navire enregistré dans `vessels` et les données du prototype
abandonné. Ta sauvegarde `sauvegardes\consignataire.sql` les contient, donc
rien n'est irrémédiable, mais la restauration demanderait du travail.

À toi de voir. La procédure en 4 étapes ci-dessus ne touche à aucune donnée.

## Ensuite, au quotidien

Après toute modification d'entité :

    npm run migration:generate -- src/migrations/DescriptionDuChangement
    npm run migration:run

Relire le fichier généré **avant** de l'appliquer. C'est tout l'intérêt de la
manœuvre : voir ce que TypeORM s'apprête à faire, notamment les `DROP COLUMN`.

Les migrations se versionnent dans git, au même titre que le code.

## Reste ouvert : A5b

La base contient 4 tables sans entité correspondante, vestiges d'une version
antérieure du service datée du 8 avril :

| Table | Lignes |
|---|---|
| `utilisateurs` | 2 |
| `requetes` | 2 |
| `cotations` | 1 |
| `notifications` | 0 |

`synchronize` ne les avait jamais supprimées : TypeORM crée et modifie, mais
ne retire jamais une table dont plus aucune entité ne parle.

Ce sont des données de test (`amadou@test.com`, `cdr@test.com`). Leur
suppression fera l'objet d'un point distinct, une fois A5a validé.
