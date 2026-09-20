import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle,
  Inbox, ArrowLeft, MapPin, CheckCircle2, XCircle, Warehouse, Clock, Receipt,
} from 'lucide-react';
import { EntrepotAPI } from '../../lib/apiF';

const STATUTS = {
  NOUVEAU: { label: 'Nouvelle', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  ACCEPTE: { label: 'Acceptée', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  STOCKE: { label: 'Stockée', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  LIBERE: { label: 'Libérée', classe: 'bg-white/10 text-white/50 border-white/20' },
  REFUSE: { label: 'Refusée', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const GRAVITES = {
  ROUGE: 'border-red-500/30 bg-red-500/10 text-red-300',
  ORANGE: 'border-[#F3921F]/30 bg-[#F3921F]/10 text-[#F3921F]',
  JAUNE: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
};

const TYPES_INCIDENT = [
  { cle: 'SECURITE', label: 'Sécurité' },
  { cle: 'MATERIEL', label: 'Matériel' },
  { cle: 'LOGISTIQUE', label: 'Logistique' },
  { cle: 'DOUANE', label: 'Douane' },
];

const formatNombre = (v) => (v == null ? '—' : Number(v).toLocaleString('fr-FR'));
const formatMontant = (v) => (v == null ? '—' : `${Number(v).toLocaleString('fr-FR')} XOF`);

const formatDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const messageErreur = (err, defaut) =>
  err.status === 503 ? "Le service Entrepôt est momentanément indisponible." : err.message || defaut;

const champ =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F36F21]';
const libelle = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45';

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

function Vide({ texte }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
      <Inbox className="h-10 w-10 text-white/20" />
      <p className="mt-4 text-sm font-bold text-white/60">{texte}</p>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
    </div>
  );
}

// ── Fiche d'une demande, avec les actions de l'exploitant ──────────────────────
function FicheDemande({ demandeId, onRetour, onModifie }) {
  const [demande, setDemande] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [factures, setFactures] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [action, setAction] = useState(null);

  const [motif, setMotif] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [emplacementId, setEmplacementId] = useState('');
  const [duree, setDuree] = useState('');
  const [modeTransport, setModeTransport] = useState('CAMION_INTERNE_SAYGOO');
  const [docsSortie, setDocsSortie] = useState({ bad: false, douane: false, facture: false });

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await EntrepotAPI.demande(demandeId);
      const d = reponse.data ?? reponse;
      setDemande(d);

      const [resHist, resFact] = await Promise.allSettled([
        EntrepotAPI.historique(demandeId),
        EntrepotAPI.factures(demandeId),
      ]);
      setHistorique(resHist.status === 'fulfilled' ? resHist.value.data ?? resHist.value ?? [] : []);
      setFactures(resFact.status === 'fulfilled' ? resFact.value.data ?? resFact.value ?? [] : []);

      // Les emplacements libres ne servent qu'au moment de l'affectation.
      if (d?.statut === 'ACCEPTE') {
        const resEmp = await EntrepotAPI.emplacementsDisponibles({ warehouseId: d.warehouseId || undefined });
        setEmplacements(resEmp.data ?? resEmp ?? []);
      }
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger la demande.'));
    } finally {
      setChargement(false);
    }
  }, [demandeId]);

  useEffect(() => {
    charger();
  }, [charger]);

  const executer = async (nom, operation) => {
    setAction(nom);
    setErreur(null);
    try {
      await operation();
      await charger();
      onModifie?.();
    } catch (err) {
      setErreur(messageErreur(err, "L'action a échoué."));
    } finally {
      setAction(null);
    }
  };

  if (chargement) return <Spinner />;

  if (!demande) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-bold text-red-300">{erreur || 'Demande introuvable.'}</p>
        <button type="button" onClick={onRetour} className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/70 underline">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onRetour}
        className="inline-flex items-center gap-2 self-start text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">{demande.reference}</h2>
            <p className="mt-1 text-sm text-white/55">{demande.clientNom}</p>
          </div>
          <Badge statut={demande.statut} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-xs lg:grid-cols-4">
          {[
            ['Marchandise', demande.marchandise],
            ['Type', demande.typeStockage],
            ['Quantité', demande.quantite ? `${formatNombre(demande.quantite)} ${demande.uniteQuantite || ''}` : '—'],
            ['Durée estimée', demande.dureeEstimeeJours ? `${demande.dureeEstimeeJours} j` : '—'],
            ['Dossier', demande.dossierRef || '—'],
            ['Téléphone', demande.contactTelephone || '—'],
            ['Entrée réelle', formatDate(demande.dateEntreeReelle)],
            ['Sortie prévue', formatDate(demande.dateSortiePrevue)],
          ].map(([label, valeur]) => (
            <div key={label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/35">{label}</p>
              <p className="mt-1 font-bold text-white/85">{valeur}</p>
            </div>
          ))}
        </div>

        {demande.emplacement && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#4CC38A]/30 bg-[#4CC38A]/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#4CC38A]">
            <MapPin className="h-4 w-4" />
            Zone {demande.emplacement.zone} · Allée {demande.emplacement.allee} · {demande.emplacement.slot}
          </p>
        )}

        {demande.motifRefus && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
            Motif du refus : {demande.motifRefus}
          </p>
        )}
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {/* Actions selon l'état de la demande */}
      {demande.statut === 'NOUVEAU' && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
          <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Décision</h3>

          <button
            type="button"
            onClick={() => executer('accepter', () => EntrepotAPI.accepter(demande.id))}
            disabled={Boolean(action)}
            className="mb-5 inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> {action === 'accepter' ? 'Traitement…' : 'Accepter la demande'}
          </button>

          <div className="mb-4">
            <label className={libelle} htmlFor="motif">Motif de refus</label>
            <div className="flex gap-3">
              <input id="motif" className={champ} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Capacité insuffisante…" />
              <button
                type="button"
                onClick={() => executer('refuser', () => EntrepotAPI.refuser(demande.id, motif))}
                disabled={!motif.trim() || Boolean(action)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-red-500/40 px-5 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-30"
              >
                <XCircle className="h-4 w-4" /> Refuser
              </button>
            </div>
          </div>

          <div>
            <label className={libelle} htmlFor="infos">Demander des informations</label>
            <div className="flex gap-3">
              <input id="infos" className={champ} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Précisez le tonnage exact…" />
              <button
                type="button"
                onClick={() => executer('infos', () => EntrepotAPI.demanderInfos(demande.id, commentaire))}
                disabled={!commentaire.trim() || Boolean(action)}
                className="shrink-0 rounded-xl border border-white/15 px-5 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-30"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {demande.statut === 'ACCEPTE' && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
          <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Affecter un emplacement</h3>

          {emplacements.length === 0 ? (
            <p className="rounded-xl border border-[#F3921F]/30 bg-[#F3921F]/10 px-4 py-3 text-xs font-bold text-[#F3921F]">
              Aucun emplacement libre dans cet entrepôt.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={libelle} htmlFor="emp">Emplacement</label>
                <select id="emp" className={champ} value={emplacementId} onChange={(e) => setEmplacementId(e.target.value)}>
                  <option value="" className="bg-[#1B1B1B]">Choisir…</option>
                  {emplacements.map((e) => (
                    <option key={e.id} value={e.id} className="bg-[#1B1B1B]">
                      Zone {e.zone} · Allée {e.allee} · {e.slot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={libelle} htmlFor="duree">Durée (jours)</label>
                <input id="duree" type="number" min="1" className={champ} value={duree} onChange={(e) => setDuree(e.target.value)} placeholder={demande.dureeEstimeeJours || ''} />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() =>
              executer('affecter', () =>
                EntrepotAPI.affecter(demande.id, {
                  emplacementId,
                  dureeEstimeeJours: duree ? Number(duree) : undefined,
                }),
              )
            }
            disabled={!emplacementId || Boolean(action)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-30"
          >
            <MapPin className="h-4 w-4" /> {action === 'affecter' ? 'Affectation…' : "Affecter l'emplacement"}
          </button>
        </div>
      )}

      {demande.statut === 'STOCKE' && (
        <>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
            <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Autoriser la sortie</h3>

            <div className="mb-4">
              <span className={libelle}>Transport</span>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { cle: 'CAMION_INTERNE_SAYGOO', label: 'Camion interne SAYGOO' },
                  { cle: 'TRANSPORTEUR_EXTERNE', label: 'Transporteur externe' },
                ].map((o) => (
                  <button
                    key={o.cle}
                    type="button"
                    onClick={() => setModeTransport(o.cle)}
                    className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      modeTransport === o.cle
                        ? 'border-[#F36F21] bg-[#F36F21]/10 text-[#F36F21]'
                        : 'border-white/10 text-white/50 hover:border-white/25'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <span className={libelle}>Documents requis</span>
            <div className="flex flex-col gap-2">
              {[
                ['bad', 'Bon à délivrer'],
                ['douane', 'Autorisation douane'],
                ['facture', 'Facture de stockage'],
              ].map(([cle, label]) => (
                <label key={cle} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <input
                    type="checkbox"
                    checked={docsSortie[cle]}
                    onChange={(e) => setDocsSortie((p) => ({ ...p, [cle]: e.target.checked }))}
                    className="h-4 w-4 accent-[#F36F21]"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/70">{label}</span>
                </label>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                executer('sortie', () =>
                  EntrepotAPI.autoriserSortie(demande.id, {
                    modeTransport,
                    dateSortie: new Date().toISOString(),
                    badConfirme: docsSortie.bad,
                    autorisationDouaneConfirmee: docsSortie.douane,
                    factureStockageConfirmee: docsSortie.facture,
                  }),
                )
              }
              disabled={Boolean(action)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
            >
              <ArrowUpFromLine className="h-4 w-4" /> {action === 'sortie' ? 'Traitement…' : 'Autoriser la sortie'}
            </button>
            <p className="mt-2 text-[10px] text-white/30">Les trois documents doivent être confirmés.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Facturation du stockage</h3>
            <button
              type="button"
              onClick={() => executer('facturer', () => EntrepotAPI.facturer(demande.id))}
              disabled={Boolean(action)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-white/30 hover:text-white disabled:opacity-30"
            >
              <Receipt className="h-4 w-4" /> {action === 'facturer' ? 'Calcul…' : 'Générer la facture'}
            </button>
            <p className="mt-2 text-[10px] text-white/30">Tarif × tonnage × durée, calculé par le service.</p>

            {factures.length > 0 && (
              <div className="mt-5 divide-y divide-white/5 rounded-xl border border-white/10">
                {factures.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-xs font-black text-white">{f.reference}</p>
                      <p className="text-[10px] text-white/40">
                        {formatNombre(f.quantite)} × {f.dureeJours} j × {formatNombre(f.tarifParTonneJour)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-[#F36F21]">{formatMontant(f.montant)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {historique.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Historique</h3>
          <div className="flex flex-col gap-3">
            {historique.map((h) => (
              <div key={h.id} className="flex items-start gap-3 border-l border-white/10 pl-4">
                <Clock className="mt-0.5 h-3 w-3 shrink-0 text-white/30" />
                <div>
                  <p className="text-xs font-bold text-white/80">{h.action}</p>
                  <p className="text-[10px] text-white/35">
                    {formatDate(h.createdAt)}
                    {h.description ? ` — ${h.description}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function CockpitEntrepot() {
  const [onglet, setOnglet] = useState('cockpit');
  const [cockpit, setCockpit] = useState(null);
  const [alertes, setAlertes] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [stock, setStock] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [demandeOuverte, setDemandeOuverte] = useState(null);
  const [nouvelIncident, setNouvelIncident] = useState({ type: 'SECURITE', description: '', zone: '' });
  const [envoiIncident, setEnvoiIncident] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    const [resCockpit, resAlertes, resDemandes, resStock, resIncidents] = await Promise.allSettled([
      EntrepotAPI.cockpit(),
      EntrepotAPI.alertes(),
      EntrepotAPI.demandes(),
      EntrepotAPI.stockActuel(),
      EntrepotAPI.incidents({ statut: 'EN_COURS' }),
    ]);

    if (resCockpit.status === 'fulfilled') {
      setCockpit(resCockpit.value.data ?? resCockpit.value ?? null);
    } else {
      setErreur(messageErreur(resCockpit.reason, 'Impossible de charger le cockpit.'));
      setCockpit(null);
    }

    setAlertes(resAlertes.status === 'fulfilled' ? resAlertes.value.data ?? resAlertes.value ?? [] : []);
    setDemandes(resDemandes.status === 'fulfilled' ? resDemandes.value.data ?? resDemandes.value ?? [] : []);
    setStock(resStock.status === 'fulfilled' ? resStock.value.data ?? resStock.value ?? [] : []);
    setIncidents(resIncidents.status === 'fulfilled' ? resIncidents.value.data ?? resIncidents.value ?? [] : []);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const declarer = async () => {
    if (!nouvelIncident.description.trim()) return;
    setEnvoiIncident(true);
    try {
      await EntrepotAPI.declarerIncident(nouvelIncident);
      setNouvelIncident({ type: 'SECURITE', description: '', zone: '' });
      charger();
    } catch (err) {
      setErreur(messageErreur(err, "L'incident n'a pas pu être déclaré."));
    } finally {
      setEnvoiIncident(false);
    }
  };

  if (demandeOuverte) {
    return (
      <FicheDemande
        demandeId={demandeOuverte}
        onRetour={() => {
          setDemandeOuverte(null);
          charger();
        }}
        onModifie={charger}
      />
    );
  }

  const nouvelles = demandes.filter((d) => d.statut === 'NOUVEAU').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Cockpit entrepôt</h2>
          <p className="mt-1 text-sm text-white/50">Stock, demandes, emplacements et incidents.</p>
        </div>
        <button
          type="button"
          onClick={charger}
          disabled={chargement}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {/* Alertes calculées par le back-end */}
      {alertes.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertes.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${GRAVITES[a.gravite] || GRAVITES.JAUNE}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-bold">{a.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Indicateurs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Vrac stocké', valeur: cockpit ? `${formatNombre(cockpit.stockEnCours?.vracTonnes)} t` : '—', Icone: Package },
          { label: 'Conteneurs', valeur: cockpit ? formatNombre(cockpit.stockEnCours?.conteneursUnites) : '—', Icone: Warehouse },
          { label: 'Entrées du jour', valeur: cockpit ? formatNombre(cockpit.entreesAujourdhui) : '—', Icone: ArrowDownToLine },
          { label: 'Sorties du jour', valeur: cockpit ? formatNombre(cockpit.sortiesAujourdhui) : '—', Icone: ArrowUpFromLine },
        ].map(({ label, valeur, Icone }) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
              <Icone className="h-4 w-4 text-[#F36F21]" /> {label}
            </div>
            <p className="mt-3 text-2xl font-black text-white">{valeur}</p>
          </div>
        ))}
      </div>

      {cockpit?.stockEnCours?.occupation != null && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/45">
            <span>Occupation des emplacements</span>
            <span className="text-white">{cockpit.stockEnCours.occupation}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#F36F21] transition-all"
              style={{ width: `${Math.min(100, cockpit.stockEnCours.occupation)}%` }}
            />
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        {[
          { cle: 'cockpit', label: `Demandes${nouvelles ? ` (${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''})` : ''}` },
          { cle: 'stock', label: `Stock actuel (${stock.length})` },
          { cle: 'incidents', label: `Incidents (${incidents.length})` },
        ].map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={`rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              onglet === o.cle
                ? 'border-[#F36F21]/50 bg-[#F36F21]/10 text-[#F36F21]'
                : 'border-white/10 text-white/50 hover:border-white/25'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {chargement ? (
        <Spinner />
      ) : onglet === 'cockpit' ? (
        demandes.length === 0 ? (
          <Vide texte="Aucune demande de stockage reçue." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {demandes.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDemandeOuverte(d.id)}
                className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Warehouse className="h-4 w-4 text-[#3C9AB7]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{d.reference}</p>
                    <p className="mt-0.5 text-xs text-white/55">
                      {d.clientNom} · {d.marchandise}
                    </p>
                    {d.emplacement && (
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4CC38A]">
                        {d.emplacement.zone} / {d.emplacement.slot}
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
        )
      ) : onglet === 'stock' ? (
        stock.length === 0 ? (
          <Vide texte="Aucune marchandise actuellement stockée." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {stock.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setDemandeOuverte(s.id)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Package className="h-4 w-4 text-[#4CC38A]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{s.reference}</p>
                    <p className="mt-0.5 text-xs text-white/55">
                      {s.marchandise} · {formatNombre(s.quantite)} {s.uniteQuantite || ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {s.emplacement && (
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#4CC38A]">
                      {s.emplacement.zone} / {s.emplacement.slot}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    Entrée {formatDate(s.dateEntreeReelle)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-5">
          {/* Déclaration rapide */}
          <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
            <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Déclarer un incident</h3>

            <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {TYPES_INCIDENT.map((t) => (
                <button
                  key={t.cle}
                  type="button"
                  onClick={() => setNouvelIncident((p) => ({ ...p, type: t.cle }))}
                  className={`rounded-xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                    nouvelIncident.type === t.cle
                      ? 'border-[#F36F21] bg-[#F36F21]/10 text-[#F36F21]'
                      : 'border-white/10 text-white/50 hover:border-white/25'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={libelle} htmlFor="desc">Description *</label>
                <input
                  id="desc"
                  className={champ}
                  value={nouvelIncident.description}
                  onChange={(e) => setNouvelIncident((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Fuite de poussière zone A…"
                />
              </div>
              <div>
                <label className={libelle} htmlFor="zone">Zone</label>
                <input
                  id="zone"
                  className={champ}
                  value={nouvelIncident.zone}
                  onChange={(e) => setNouvelIncident((p) => ({ ...p, zone: e.target.value }))}
                  placeholder="A"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={declarer}
              disabled={!nouvelIncident.description.trim() || envoiIncident}
              className="mt-5 rounded-xl bg-[#F36F21] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-30"
            >
              {envoiIncident ? 'Déclaration…' : "Déclarer l'incident"}
            </button>
          </div>

          {incidents.length === 0 ? (
            <Vide texte="Aucun incident en cours." />
          ) : (
            <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
              {incidents.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-xl border p-3 ${GRAVITES[i.gravite] || GRAVITES.JAUNE}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{i.reference}</p>
                      <p className="mt-0.5 text-xs text-white/55">
                        {i.description}
                        {i.zone ? ` · Zone ${i.zone}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => EntrepotAPI.resoudreIncident(i.id).then(charger).catch(() => {})}
                    className="rounded-lg border border-[#4CC38A]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#4CC38A] hover:bg-[#4CC38A]/10"
                  >
                    Résoudre
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}