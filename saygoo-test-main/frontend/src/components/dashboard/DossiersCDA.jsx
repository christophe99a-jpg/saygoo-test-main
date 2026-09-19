import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Search, FileText, AlertTriangle, Inbox, ArrowLeft,
  UserCheck, XCircle, FileWarning, CheckCircle2, History,
} from 'lucide-react';
import { DossierAPI } from '../../lib/apiF';

// Étapes du traitement, dans l'ordre du workflow douanier
const STATUTS = {
  EN_ATTENTE: { label: 'En attente', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  EN_COURS: { label: 'En cours', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  DOCUMENTS_COMPLEMENTAIRES: { label: 'Docs manquants', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  DECLARE: { label: 'Déclaré', classe: 'bg-[#8B7CF6]/15 text-[#A99BFF] border-[#8B7CF6]/30' },
  EN_ATTENTE_DOUANE: { label: 'Attente Douane', classe: 'bg-[#8B7CF6]/15 text-[#A99BFF] border-[#8B7CF6]/30' },
  DEDOUANE: { label: 'Dédouané', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  LIVRE: { label: 'Livré', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  ANNULE: { label: 'Annulé', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

// Transitions proposées depuis l'écran de traitement
const ETAPES_SUIVANTES = [
  { cle: 'DECLARE', label: 'Déclaration déposée' },
  { cle: 'EN_ATTENTE_DOUANE', label: 'En attente Douane' },
  { cle: 'DEDOUANE', label: 'Bon à enlever obtenu' },
  { cle: 'LIVRE', label: 'Livré' },
];

const FILTRES = [
  { cle: '', label: 'Tous' },
  { cle: 'EN_ATTENTE', label: 'En attente' },
  { cle: 'EN_COURS', label: 'En cours' },
  { cle: 'DOCUMENTS_COMPLEMENTAIRES', label: 'Docs manquants' },
  { cle: 'DECLARE', label: 'Déclarés' },
  { cle: 'DEDOUANE', label: 'Dédouanés' },
];

const formatDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatMontant = (v) => (v == null ? '—' : `${Number(v).toLocaleString('fr-FR')} XOF`);

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

const messageErreur = (err, defaut) =>
  err.status === 503 ? 'Le service dossiers est momentanément indisponible.' : err.message || defaut;

// ── Fiche détaillée avec les actions du workflow ───────────────────────────────
function FicheDossier({ dossierId, onRetour, onModifie }) {
  const [dossier, setDossier] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [action, setAction] = useState(null);
  const [motif, setMotif] = useState('');
  const [documents, setDocuments] = useState('');
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const [detail, hist] = await Promise.all([
        DossierAPI.detail(dossierId),
        DossierAPI.historique(dossierId).catch(() => ({ data: { historique: [] } })),
      ]);
      setDossier(detail.data?.dossier ?? null);
      setHistorique(hist.data?.historique ?? []);
      setErreur(null);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger le dossier.'));
    } finally {
      setChargement(false);
    }
  }, [dossierId]);

  useEffect(() => { charger(); }, [charger]);

  const executer = async (operation, messageDefaut) => {
    setEnCours(true);
    setErreur(null);
    try {
      await operation();
      setAction(null);
      setMotif('');
      setDocuments('');
      await charger();
      onModifie?.();
    } catch (err) {
      setErreur(messageErreur(err, messageDefaut));
    } finally {
      setEnCours(false);
    }
  };

  if (chargement && !dossier) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-bold text-red-300">{erreur || 'Dossier introuvable.'}</p>
        <button type="button" onClick={onRetour} className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/70 underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const bouton =
    'inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/75 transition hover:border-[#F36F21]/40 hover:text-white disabled:opacity-40';

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={onRetour} className="inline-flex w-fit items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>

      {/* Entête */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase text-white">{dossier.reference}</h2>
            <p className="mt-1 text-sm text-white/55">{dossier.clientNom}</p>
          </div>
          <Badge statut={dossier.statut} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-xs lg:grid-cols-4">
          {[
            ['Marchandise', dossier.typeMarchandise],
            ['Régime', dossier.regimeDouanier],
            ['Code SH', dossier.codeHS || '—'],
            ['Conteneurs', dossier.nombreConteneurs ?? '—'],
            ['Origine', dossier.paysOrigine || '—'],
            ['Port de chargement', dossier.portEmbarquement || '—'],
            ['Destination', dossier.portDestination || '—'],
            ['Poids', dossier.poids ? `${Number(dossier.poids).toLocaleString('fr-FR')} kg` : '—'],
            // La valeur CAF (CIF) est la base de calcul des droits : elle prime
            // à l'affichage sur le FOB, qui n'est renseigné que s'il est connu.
            ['Valeur CAF', formatMontant(dossier.valeurCIF)],
            ['Valeur FOB', formatMontant(dossier.valeurFOB)],
            ['Transport', dossier.modeTransport || '—'],
            ['Distance', dossier.distanceKm ? `${Number(dossier.distanceKm).toLocaleString('fr-FR')} km` : '—'],
            ['Connaissement', dossier.numeroConnaissement || '—'],
            ['Déclaration', dossier.numeroDeclaration || '—'],
            ['Paiement', dossier.modePaiement ? `${dossier.modePaiement}${dossier.paiementFractionne ? ' (fractionné)' : ''}` : '—'],
            ['Agent', dossier.agentNom || 'Non affecté'],
          ].map(([label, valeur]) => (
            <div key={label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</p>
              <p className="mt-1 font-bold text-white/85">{valeur}</p>
            </div>
          ))}
        </div>

        {dossier.lienGeolocalisation && (
          <a
            href={dossier.lienGeolocalisation}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#3C9AB7]/30 bg-[#3C9AB7]/10 px-4 py-3 text-xs font-bold text-[#3C9AB7] hover:bg-[#3C9AB7]/20"
          >
            📍 Ouvrir le lieu de livraison
          </a>
        )}

        {dossier.servicesGMS?.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {dossier.servicesGMS.map((service) => (
              <span
                key={service}
                className="rounded-md border border-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/60"
              >
                {service}
              </span>
            ))}
          </div>
        )}

        {dossier.description && (
          <p className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-white/60">
            {dossier.description}
          </p>
        )}
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-white/45">Actions</p>

        <div className="flex flex-wrap gap-3">
          {dossier.statut === 'EN_ATTENTE' && (
            <button
              type="button"
              disabled={enCours}
              onClick={() => executer(() => DossierAPI.prendreEnCharge(dossier.id), 'La prise en charge a échoué.')}
              className={bouton}
            >
              <UserCheck className="h-4 w-4" /> Prendre en charge
            </button>
          )}

          <button type="button" disabled={enCours} onClick={() => setAction('documents')} className={bouton}>
            <FileWarning className="h-4 w-4" /> Demander des documents
          </button>

          {dossier.statut !== 'ANNULE' && dossier.statut !== 'LIVRE' && (
            <button type="button" disabled={enCours} onClick={() => setAction('rejet')} className={bouton}>
              <XCircle className="h-4 w-4" /> Rejeter
            </button>
          )}

          <button
            type="button"
            disabled={enCours}
            onClick={() => executer(() => DossierAPI.cloturer(dossier.id), 'La clôture a échoué.')}
            className={bouton}
          >
            <CheckCircle2 className="h-4 w-4" /> Clôturer
          </button>
        </div>

        {/* Avancement du traitement */}
        <p className="mb-3 mt-7 text-[10px] font-black uppercase tracking-widest text-white/45">
          Faire avancer le traitement
        </p>
        <div className="flex flex-wrap gap-2">
          {ETAPES_SUIVANTES.map((etape) => (
            <button
              key={etape.cle}
              type="button"
              disabled={enCours || dossier.statut === etape.cle}
              onClick={() =>
                executer(
                  () => DossierAPI.majTraitement(dossier.id, { statut: etape.cle }),
                  'La mise à jour a échoué.'
                )
              }
              className={`rounded-xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition ${
                dossier.statut === etape.cle
                  ? 'border-[#F36F21]/50 bg-[#F36F21]/10 text-[#F36F21]'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              } disabled:opacity-40`}
            >
              {etape.label}
            </button>
          ))}
        </div>

        {/* Formulaires contextuels */}
        {action === 'rejet' && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45" htmlFor="motif">
              Motif du rejet *
            </label>
            <textarea
              id="motif"
              rows={2}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-red-400"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enCours || !motif.trim()}
                onClick={() => executer(() => DossierAPI.rejeter(dossier.id, motif.trim()), 'Le rejet a échoué.')}
                className="rounded-xl bg-red-500/80 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40"
              >
                Confirmer le rejet
              </button>
              <button type="button" onClick={() => setAction(null)} className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Annuler
              </button>
            </div>
          </div>
        )}

        {action === 'documents' && (
          <div className="mt-6 rounded-xl border border-[#F3921F]/20 bg-[#F3921F]/5 p-4">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45" htmlFor="docs">
              Documents manquants (séparés par des virgules) *
            </label>
            <input
              id="docs"
              value={documents}
              onChange={(e) => setDocuments(e.target.value)}
              placeholder="Facture commerciale, Certificat d'origine"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F3921F]"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={enCours || !documents.trim()}
                onClick={() =>
                  executer(
                    () =>
                      DossierAPI.demanderDocuments(dossier.id, {
                        documentsManquants: documents.split(',').map((d) => d.trim()).filter(Boolean),
                      }),
                    'La demande a échoué.'
                  )
                }
                className="rounded-xl bg-[#F3921F] px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40"
              >
                Envoyer la demande
              </button>
              <button type="button" onClick={() => setAction(null)} className="text-[10px] font-black uppercase tracking-widest text-white/50">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Historique */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
          <History className="h-4 w-4" /> Historique
        </p>

        {historique.length === 0 ? (
          <p className="text-xs text-white/35">Aucun événement enregistré.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {historique.map((h) => (
              <div key={h.id} className="flex gap-3 border-l border-white/10 pl-4">
                <div>
                  <p className="text-xs font-bold text-white/85">{h.action}</p>
                  {h.description && <p className="text-[11px] text-white/45">{h.description}</p>}
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/30">
                    {formatDate(h.createdAt)} {h.userNom ? `· ${h.userNom}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Liste des dossiers ──────────────────────────────────────────────────────────
export default function DossiersCDA() {
  const [dossiers, setDossiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');
  const [dossierOuvert, setDossierOuvert] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await DossierAPI.lister({ search: recherche || undefined, statut: filtre || undefined });
      setDossiers(reponse.data?.dossiers ?? []);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les dossiers.'));
      setDossiers([]);
    } finally {
      setChargement(false);
    }
  }, [recherche, filtre]);

  useEffect(() => { charger(); }, [filtre]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dossierOuvert) {
    return (
      <FicheDossier
        dossierId={dossierOuvert}
        onRetour={() => { setDossierOuvert(null); charger(); }}
        onModifie={charger}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Dossiers de dédouanement</h2>
          <p className="text-sm text-white/50">Traitez les demandes transmises par les opérateurs économiques.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && charger()}
              placeholder="Référence, client, connaissement…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-[#F36F21]"
            />
          </div>
          <button
            type="button"
            onClick={charger}
            disabled={chargement}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            Rechercher
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTRES.map((f) => (
            <button
              key={f.cle || 'tous'}
              type="button"
              onClick={() => setFiltre(f.cle)}
              className={`rounded-lg border px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition ${
                filtre === f.cle
                  ? 'border-[#F36F21]/50 bg-[#F36F21]/10 text-[#F36F21]'
                  : 'border-white/10 text-white/50 hover:border-white/25'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {chargement && dossiers.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : dossiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
          <Inbox className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-bold text-white/60">
            {recherche || filtre ? 'Aucun dossier ne correspond à ces critères.' : 'Aucun dossier à traiter.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {dossiers.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDossierOuvert(d.id)}
              className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <FileText className="h-4 w-4 text-[#F36F21]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{d.reference}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {d.clientNom} · {d.typeMarchandise}
                  </p>
                  {d.agentNom && (
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      Agent : {d.agentNom}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 pl-16 sm:pl-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  {formatDate(d.createdAt)}
                </span>
                <Badge statut={d.statut} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
