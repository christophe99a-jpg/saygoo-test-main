# =============================================================================
# SAYGOO — Audit des bases de données
#
# Pour chaque service, compare le schéma Prisma du dépôt à la base réelle :
#   - la base existe-t-elle ?
#   - quelles tables contient-elle ?
#   - combien de lignes dans chacune ?
#   - des tables du schéma manquent-elles en base ?
#   - des tables en base sont-elles absentes du schéma ?
#
# Lecture seule : aucune écriture, aucune migration, aucune suppression.
#
# Usage, depuis la racine du dépôt (saygoo-test-main) :
#     powershell -ExecutionPolicy Bypass -File audit-bases.ps1
# =============================================================================

$ErrorActionPreference = 'Continue'

# --- Localiser psql ----------------------------------------------------------
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
    $candidats = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue
    if ($candidats) { $psql = $candidats[-1].FullName }
}
if (-not $psql) {
    Write-Host "psql introuvable. Ajoutez PostgreSQL\bin au PATH." -ForegroundColor Red
    exit 1
}

# --- Trouver les services (un .env a cote d'un prisma/schema.prisma) ---------
$schemas = Get-ChildItem -Recurse -Filter 'schema.prisma' -ErrorAction SilentlyContinue |
           Where-Object { $_.FullName -notmatch 'node_modules' }

if (-not $schemas) {
    Write-Host "Aucun schema.prisma trouve. Lancez le script depuis la racine du depot." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "AUDIT DES BASES SAYGOO" -ForegroundColor Cyan
Write-Host "$($schemas.Count) schema(s) Prisma detecte(s)"
Write-Host ("=" * 78)

$resume = @()

foreach ($schema in $schemas) {

    $racine  = Split-Path (Split-Path $schema.FullName -Parent) -Parent
    $service = Split-Path $racine -Leaf
    $envFile = Join-Path $racine '.env'

    Write-Host ""
    Write-Host "--- $service" -ForegroundColor Yellow

    if (-not (Test-Path $envFile)) {
        Write-Host "    .env absent — service non configure" -ForegroundColor Red
        $resume += [pscustomobject]@{ Service=$service; Base='-'; Etat='.env absent'; Tables=0; Lignes=0 }
        continue
    }

    # --- Extraire la chaine de connexion -------------------------------------
    $ligne = Select-String -Path $envFile -Pattern '^DATABASE_URL' | Select-Object -First 1
    if (-not $ligne) {
        Write-Host "    DATABASE_URL absente du .env" -ForegroundColor Red
        $resume += [pscustomobject]@{ Service=$service; Base='-'; Etat='DATABASE_URL absente'; Tables=0; Lignes=0 }
        continue
    }

    $url = $ligne.Line -replace '^DATABASE_URL\s*=\s*', '' -replace '"', '' -replace "'", ''

    if ($url -notmatch 'postgresql://([^:]+):([^@]*)@([^:/]+):(\d+)/([^?]+)') {
        Write-Host "    DATABASE_URL illisible" -ForegroundColor Red
        $resume += [pscustomobject]@{ Service=$service; Base='?'; Etat='URL illisible'; Tables=0; Lignes=0 }
        continue
    }

    $user = $Matches[1]; $pass = $Matches[2]
    $hote = $Matches[3]; $port = $Matches[4]; $base = $Matches[5]

    if ($pass -match 'MOT_DE_PASSE|CHANGEME|xxxx') {
        Write-Host "    Mot de passe non renseigne dans le .env" -ForegroundColor Red
        $resume += [pscustomobject]@{ Service=$service; Base=$base; Etat='.env incomplet'; Tables=0; Lignes=0 }
        continue
    }

    Write-Host "    base : $base"

    # --- Modeles declares dans le schema -------------------------------------
    $contenu = Get-Content $schema.FullName -Raw

    # @@map("nom") impose le nom de table ; sinon Prisma utilise le nom du modele
    $attendues = @()
    foreach ($m in [regex]::Matches($contenu, '(?ms)^model\s+(\w+)\s*\{(.*?)^\}')) {
        $nomModele = $m.Groups[1].Value
        $corps     = $m.Groups[2].Value
        $map       = [regex]::Match($corps, '@@map\("([^"]+)"\)')
        $attendues += if ($map.Success) { $map.Groups[1].Value } else { $nomModele }
    }

    # --- Interroger la base ---------------------------------------------------
    $env:PGPASSWORD = $pass

    $requete = @"
SELECT c.relname || '|' || COALESCE(s.n_live_tup, 0)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
WHERE c.relkind = 'r' AND n.nspname = 'public'
ORDER BY c.relname;
"@

    $sortie = & $psql -U $user -h $hote -p $port -d $base -t -A -c $requete 2>&1
    $code = $LASTEXITCODE
    $env:PGPASSWORD = ''

    if ($code -ne 0) {
        $motif = if ($sortie -match "n'existe pas|does not exist") { 'base inexistante' }
                 elseif ($sortie -match 'authentification|authentication') { 'identifiants refuses' }
                 else { 'connexion impossible' }
        Write-Host "    $motif" -ForegroundColor Red
        $resume += [pscustomobject]@{ Service=$service; Base=$base; Etat=$motif; Tables=0; Lignes=0 }
        continue
    }

    $tables = @{}
    foreach ($l in $sortie) {
        if ($l -match '^(.+)\|(\d+)$') { $tables[$Matches[1]] = [int]$Matches[2] }
    }

    $reelles   = $tables.Keys | Where-Object { $_ -ne '_prisma_migrations' }
    $manquantes = $attendues | Where-Object { $_ -notin $reelles }
    $enTrop     = $reelles   | Where-Object { $_ -notin $attendues }
    $total      = ($tables.Values | Measure-Object -Sum).Sum

    Write-Host "    modeles au schema : $($attendues.Count)   tables en base : $($reelles.Count)"

    if ($reelles.Count -eq 0) {
        Write-Host "    base vide — aucune migration appliquee" -ForegroundColor DarkYellow
    }

    if ($manquantes) {
        Write-Host "    MANQUE en base : $($manquantes -join ', ')" -ForegroundColor Red
    }
    if ($enTrop) {
        Write-Host "    EN TROP (absentes du schema) : $($enTrop -join ', ')" -ForegroundColor Magenta
    }
    if (-not $manquantes -and -not $enTrop -and $reelles.Count -gt 0) {
        Write-Host "    schema et base concordent" -ForegroundColor Green
    }

    # Tables contenant des donnees — c'est ce qui interdit un reset a l'aveugle
    $peuplees = $tables.GetEnumerator() |
                Where-Object { $_.Value -gt 0 -and $_.Key -ne '_prisma_migrations' } |
                Sort-Object -Property Value -Descending

    if ($peuplees) {
        Write-Host "    DONNEES PRESENTES :" -ForegroundColor Cyan
        foreach ($t in $peuplees) { Write-Host "      $($t.Key) : $($t.Value) ligne(s)" }
    }

    $etat = if ($manquantes) { 'schema incomplet' }
            elseif ($enTrop) { 'tables orphelines' }
            elseif ($reelles.Count -eq 0) { 'base vide' }
            else { 'OK' }

    $resume += [pscustomobject]@{
        Service = $service; Base = $base; Etat = $etat
        Tables  = $reelles.Count; Lignes = $total
    }
}

# --- Synthese ----------------------------------------------------------------
Write-Host ""
Write-Host ("=" * 78)
Write-Host "SYNTHESE" -ForegroundColor Cyan
$resume | Format-Table -AutoSize

$avecDonnees = $resume | Where-Object { $_.Lignes -gt 0 }
if ($avecDonnees) {
    Write-Host "Bases contenant des donnees — ne jamais accepter un reset dessus :" -ForegroundColor Yellow
    $avecDonnees | ForEach-Object { Write-Host "  $($_.Base) : $($_.Lignes) ligne(s)" }
} else {
    Write-Host "Aucune base ne contient de donnees. Les resets sont sans risque." -ForegroundColor Green
}

Write-Host ""
Write-Host "Note : les comptages viennent de pg_stat_user_tables (approximatifs" -ForegroundColor DarkGray
Write-Host "sur une base jamais analysee). Un 0 affiche peut valoir quelques lignes :" -ForegroundColor DarkGray
Write-Host "verifiez par un COUNT(*) avant toute suppression." -ForegroundColor DarkGray
Write-Host ""
Write-Host "Les services NestJS (consignataire, entrepot) utilisent TypeORM et ne" -ForegroundColor DarkGray
Write-Host "sont pas couverts par cet audit." -ForegroundColor DarkGray
