#!/usr/bin/env node
/**
 * SAYGOO — Audit des bases de donnees
 *
 * Pour chaque service Prisma, compare le schema du depot a la base reelle :
 *   - la base existe-t-elle et repond-elle ?
 *   - quelles tables contient-elle ?
 *   - combien de lignes dans chacune ?
 *   - des tables du schema manquent-elles en base ?
 *   - des tables en base sont-elles absentes du schema ?
 *
 * LECTURE SEULE. Aucune ecriture, aucune migration, aucune suppression.
 *
 * Usage, depuis la racine du depot :
 *     node audit-bases.js
 *
 * Aucune dependance : uniquement les modules natifs de Node.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// ─── Localisation de psql ────────────────────────────────────────────────────

function trouverPsql() {
  // 1. Dans le PATH
  try {
    execFileSync('psql', ['--version'], { stdio: 'ignore' });
    return 'psql';
  } catch { /* on continue */ }

  // 2. Emplacements d'installation habituels sous Windows
  const bases = ['C:\\Program Files\\PostgreSQL', 'C:\\Program Files (x86)\\PostgreSQL'];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    const versions = fs.readdirSync(base).sort().reverse();
    for (const v of versions) {
      const candidat = path.join(base, v, 'bin', 'psql.exe');
      if (fs.existsSync(candidat)) return candidat;
    }
  }
  return null;
}

// ─── Recherche des schemas Prisma ────────────────────────────────────────────

function chercherSchemas(racine, trouves = []) {
  let entrees;
  try {
    entrees = fs.readdirSync(racine, { withFileTypes: true });
  } catch {
    return trouves;
  }

  for (const entree of entrees) {
    if (entree.name === 'node_modules' || entree.name.startsWith('.git')) continue;
    const complet = path.join(racine, entree.name);
    if (entree.isDirectory()) {
      chercherSchemas(complet, trouves);
    } else if (entree.name === 'schema.prisma') {
      trouves.push(complet);
    }
  }
  return trouves;
}

// ─── Extraction des tables attendues ─────────────────────────────────────────

/**
 * Sans directive @@map, Prisma nomme la table comme le modele.
 * Avec @@map("nom"), c'est ce nom qui fait foi.
 */
function tablesDuSchema(contenu) {
  const tables = [];
  const modeles = contenu.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm);

  for (const modele of modeles) {
    const nom = modele[1];
    const corps = modele[2];
    const map = corps.match(/@@map\(\s*["']([^"']+)["']\s*\)/);
    tables.push(map ? map[1] : nom);
  }
  return tables;
}

// ─── Lecture de DATABASE_URL ─────────────────────────────────────────────────

function lireConnexion(fichierEnv) {
  if (!fs.existsSync(fichierEnv)) return { erreur: '.env absent' };

  const contenu = fs.readFileSync(fichierEnv, 'utf8');
  const ligne = contenu.split(/\r?\n/).find((l) => l.trim().startsWith('DATABASE_URL'));
  if (!ligne) return { erreur: 'DATABASE_URL absente' };

  const url = ligne
    .replace(/^\s*DATABASE_URL\s*=\s*/, '')
    .replace(/^["']|["']\s*$/g, '')
    .trim();

  const m = url.match(/postgresql:\/\/([^:]+):([^@]*)@([^:/]+):(\d+)\/([^?]+)/);
  if (!m) return { erreur: 'DATABASE_URL illisible' };

  const [, utilisateur, motDePasse, hote, port, base] = m;

  if (/MOT_DE_PASSE|CHANGEME|LE_MOT_DE_PASSE|xxxx/i.test(motDePasse)) {
    return { erreur: 'mot de passe non renseigne', base };
  }

  return {
    utilisateur,
    motDePasse: decodeURIComponent(motDePasse),
    hote,
    port,
    base
  };
}

// ─── Interrogation de la base ────────────────────────────────────────────────

const REQUETE = [
  "SELECT c.relname || '|' || COALESCE(s.n_live_tup, 0)",
  'FROM pg_class c',
  'JOIN pg_namespace n ON n.oid = c.relnamespace',
  'LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid',
  "WHERE c.relkind = 'r' AND n.nspname = 'public'",
  'ORDER BY c.relname'
].join(' ');

function interroger(psql, cx) {
  try {
    const sortie = execFileSync(
      psql,
      ['-U', cx.utilisateur, '-h', cx.hote, '-p', cx.port, '-d', cx.base, '-t', '-A', '-c', REQUETE],
      {
        env: { ...process.env, PGPASSWORD: cx.motDePasse, PGCLIENTENCODING: 'UTF8' },
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const tables = {};
    for (const ligne of sortie.split(/\r?\n/)) {
      const m = ligne.match(/^(.+)\|(\d+)$/);
      if (m) tables[m[1]] = Number(m[2]);
    }
    return { tables };
  } catch (err) {
    const texte = String(err.stderr || err.message || '');
    let motif = 'connexion impossible';
    if (/does not exist|n'existe pas/i.test(texte)) motif = 'base inexistante';
    else if (/authentication|authentification/i.test(texte)) motif = 'identifiants refuses';
    else if (/ECONNREFUSED|could not connect|connexion au serveur/i.test(texte)) motif = 'serveur injoignable';
    return { erreur: motif };
  }
}

// ─── Programme principal ─────────────────────────────────────────────────────

function principal() {
  const psql = trouverPsql();
  if (!psql) {
    console.error('psql introuvable. Ajoutez le dossier bin de PostgreSQL au PATH.');
    process.exit(1);
  }

  const schemas = chercherSchemas(process.cwd());
  if (schemas.length === 0) {
    console.error('Aucun schema.prisma trouve. Lancez le script depuis la racine du depot.');
    process.exit(1);
  }

  console.log('');
  console.log('AUDIT DES BASES SAYGOO');
  console.log(`${schemas.length} schema(s) Prisma detecte(s)`);
  console.log('='.repeat(76));

  const resume = [];

  for (const schema of schemas) {
    const racineService = path.dirname(path.dirname(schema));
    const service = path.basename(racineService);

    console.log('');
    console.log(`--- ${service}`);

    const cx = lireConnexion(path.join(racineService, '.env'));
    if (cx.erreur) {
      console.log(`    ${cx.erreur}`);
      resume.push({ Service: service, Base: cx.base || '-', Etat: cx.erreur, Tables: 0, Lignes: 0 });
      continue;
    }

    console.log(`    base : ${cx.base}`);

    const attendues = tablesDuSchema(fs.readFileSync(schema, 'utf8'));
    const resultat = interroger(psql, cx);

    if (resultat.erreur) {
      console.log(`    ${resultat.erreur}`);
      resume.push({ Service: service, Base: cx.base, Etat: resultat.erreur, Tables: 0, Lignes: 0 });
      continue;
    }

    const toutes = Object.keys(resultat.tables);
    const reelles = toutes.filter((t) => t !== '_prisma_migrations');
    const manquantes = attendues.filter((t) => !reelles.includes(t));
    const enTrop = reelles.filter((t) => !attendues.includes(t));
    const totalLignes = reelles.reduce((s, t) => s + resultat.tables[t], 0);

    console.log(`    modeles au schema : ${attendues.length}   tables en base : ${reelles.length}`);

    if (reelles.length === 0) {
      console.log('    BASE VIDE - aucune migration appliquee');
    }
    if (manquantes.length) {
      console.log(`    MANQUE en base : ${manquantes.join(', ')}`);
    }
    if (enTrop.length) {
      console.log(`    EN TROP (absentes du schema) : ${enTrop.join(', ')}`);
    }
    if (!manquantes.length && !enTrop.length && reelles.length > 0) {
      console.log('    schema et base concordent');
    }

    // Les tables peuplees sont celles qui interdisent un reset a l'aveugle.
    const peuplees = reelles
      .filter((t) => resultat.tables[t] > 0)
      .sort((a, b) => resultat.tables[b] - resultat.tables[a]);

    if (peuplees.length) {
      console.log('    DONNEES PRESENTES :');
      for (const t of peuplees) console.log(`      ${t} : ${resultat.tables[t]} ligne(s)`);
    }

    let etat = 'OK';
    if (manquantes.length) etat = 'schema incomplet';
    else if (enTrop.length) etat = 'tables orphelines';
    else if (reelles.length === 0) etat = 'base vide';

    resume.push({
      Service: service,
      Base: cx.base,
      Etat: etat,
      Tables: reelles.length,
      Lignes: totalLignes
    });
  }

  console.log('');
  console.log('='.repeat(76));
  console.log('SYNTHESE');
  console.table(resume);

  const avecDonnees = resume.filter((r) => r.Lignes > 0);
  if (avecDonnees.length) {
    console.log('Bases contenant des donnees - ne jamais accepter un reset dessus :');
    for (const r of avecDonnees) console.log(`  ${r.Base} : ${r.Lignes} ligne(s)`);
  } else {
    console.log('Aucune base ne contient de donnees. Les resets sont sans risque.');
  }

  console.log('');
  console.log('Note : les comptages viennent de pg_stat_user_tables et sont approximatifs');
  console.log('sur une base jamais analysee. Un 0 affiche peut valoir quelques lignes :');
  console.log('verifiez par un COUNT(*) avant toute suppression.');
  console.log('');
  console.log('Les services NestJS (consignataire, entrepot) utilisent TypeORM et ne sont');
  console.log('pas couverts par cet audit.');
}

principal();
