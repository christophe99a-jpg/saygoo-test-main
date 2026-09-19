import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Wallet, Lock, ArrowUpRight, ArrowDownLeft, AlertTriangle,
  Inbox, Landmark, Plus, X, CheckCircle2, XCircle,
} from 'lucide-react';
import { CompteAPI } from '../../lib/apiF';

// Méthodes d'instruction acceptées par le back-end
const METHODES = [
  { cle: 'VIREMENT_BANCAIRE', label: 'Virement bancaire' },
  { cle: 'VISA_BUSINESS', label: 'Visa Business' },
  { cle: 'PAYGATE_FLOOZ', label: 'PayGate / Flooz' },
  { cle: 'TMONEY', label: 'T-Money' },
];

// Cycle de vie d'une instruction de paiement
const STATUTS_INSTRUCTION = {
  DEMANDE: { label: 'Demande', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  TRANSMISE: { label: 'Transmise', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  EN_TRAITEMENT: { label: 'En traitement', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  EXECUTEE: { label: 'Exécutée', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  REJETEE: { label: 'Rejetée', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const STATUTS_RESERVATION = {
  ACTIVE: { label: 'Active', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  LIBEREE: { label: 'Libérée', classe: 'bg-white/10 text-white/50 border-white/20' },
  CONSOMMEE: { label: 'Consommée', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
};

// Une opération est un crédit si le solde a augmenté
const estCredit = (op) => op.soldeApres > op.soldeAvant;

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
  err.status === 503 ? 'Le service Compte Logistique est momentanément indisponible.' : err.message || defaut;

function Badge({ statut, table }) {
  const s = table[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

const champ =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F36F21]';
const libelle = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45';

// ── Formulaire : nouvelle instruction de paiement ──────────────────────────────
function FormulaireInstruction({ onAnnuler, onSucces }) {
  const [montant, setMontant] = useState('');
  const [methode, setMethode] = useState('VIREMENT_BANCAIRE');
  const [partenaire, setPartenaire] = useState('');
  const [dossierRef, setDossierRef] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valider = async () => {
    if (!montant || Number(montant) <= 0) {
      setErreur('Le montant doit être supérieur à 0.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await CompteAPI.creerInstruction({
        montant: Number(montant),
        methode,
        partenaire: partenaire.trim() || undefined,
        dossierRef: dossierRef.trim() || undefined,
      });
      onSucces();
    } catch (err) {
      setErreur(messageErreur(err, "L'instruction n'a pas pu être créée."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <div className="mb-5 flex items-start justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">Nouvelle instruction de paiement</h3>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={libelle} htmlFor="montant">Montant (XOF) *</label>
          <input id="montant" type="number" min="0" className={champ} value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="partenaire">Partenaire financier</label>
          <input id="partenaire" className={champ} value={partenaire} onChange={(e) => setPartenaire(e.target.value)} placeholder="ECOBANK Business" />
        </div>
        <div className="sm:col-span-2">
          <span className={libelle}>Méthode</span>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {METHODES.map((m) => (
              <button
                key={m.cle}
                type="button"
                onClick={() => setMethode(m.cle)}
                className={`rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                  methode === m.cle
                    ? 'border-[#F36F21] bg-[#F36F21]/10 text-[#F36F21]'
                    : 'border-white/10 text-white/50 hover:border-white/25'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={libelle} htmlFor="dossierRef">Référence dossier (facultatif)</label>
          <input id="dossierRef" className={champ} value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} placeholder="DD-2026-000001" />
        </div>
      </div>

      {erreur && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={valider}
        disabled={envoi}
        className="mt-6 w-full rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
      >
        {envoi ? 'Création…' : "Créer l'instruction"}
      </button>
    </div>
  );
}

// ── Formulaire : réservation de fonds ───────────────────────────────────────────
function FormulaireReservation({ onAnnuler, onSucces }) {
  const [montant, setMontant] = useState('');
  const [motif, setMotif] = useState('');
  const [dossierRef, setDossierRef] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valider = async () => {
    if (!montant || Number(montant) <= 0) {
      setErreur('Le montant doit être supérieur à 0.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await CompteAPI.creerReservation({
        montant: Number(montant),
        motif: motif.trim() || undefined,
        dossierRef: dossierRef.trim() || undefined,
      });
      onSucces();
    } catch (err) {
      setErreur(messageErreur(err, "La réservation n'a pas pu être créée."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Réserver des fonds</h3>
          <p className="mt-1 text-[11px] text-white/45">
            Le montant est bloqué sur le compte jusqu&apos;à libération ou consommation.
          </p>
        </div>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={libelle} htmlFor="res-montant">Montant (XOF) *</label>
          <input id="res-montant" type="number" min="0" className={champ} value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="res-dossier">Référence dossier</label>
          <input id="res-dossier" className={champ} value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={libelle} htmlFor="res-motif">Motif</label>
          <input id="res-motif" className={champ} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Droits de douane dossier DD-…" />
        </div>
      </div>

      {erreur && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={valider}
        disabled={envoi}
        className="mt-6 w-full rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
      >
        {envoi ? 'Réservation…' : 'Réserver les fonds'}
      </button>
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function CompteLogistique() {
  const [onglet, setOnglet] = useState('operations');
  const [solde, setSolde] = useState(null);
  const [operations, setOperations] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [formulaire, setFormulaire] = useState(null);
  const [action, setAction] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    // Le solde est prioritaire ; le reste peut échouer sans masquer l'essentiel.
    try {
      const reponseSolde = await CompteAPI.solde();
      setSolde(reponseSolde.data ?? null);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger le solde.'));
      setSolde(null);
      setChargement(false);
      return;
    }

    const [resOps, resInstr, resResa] = await Promise.allSettled([
      CompteAPI.historique(),
      CompteAPI.instructions(),
      CompteAPI.reservations(),
    ]);

    setOperations(resOps.status === 'fulfilled' ? resOps.value.data?.operations ?? [] : []);
    setInstructions(resInstr.status === 'fulfilled' ? resInstr.value.data?.instructions ?? [] : []);
    setReservations(resResa.status === 'fulfilled' ? resResa.value.data?.reservations ?? [] : []);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const executer = async (nom, operation) => {
    setAction(nom);
    setErreur(null);
    try {
      await operation();
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, "L'action a échoué."));
    } finally {
      setAction(null);
    }
  };

  if (formulaire === 'instruction') {
    return (
      <FormulaireInstruction
        onAnnuler={() => setFormulaire(null)}
        onSucces={() => {
          setFormulaire(null);
          setOnglet('instructions');
          charger();
        }}
      />
    );
  }

  if (formulaire === 'reservation') {
    return (
      <FormulaireReservation
        onAnnuler={() => setFormulaire(null)}
        onSucces={() => {
          setFormulaire(null);
          setOnglet('reservations');
          charger();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Entête */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Compte Logistique Numérique</h2>
          <p className="mt-1 text-sm text-white/50">Instructions de paiement, réservations et suivi budgétaire.</p>
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

      {/* Soldes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#4CC38A]/25 bg-black/20 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
            <Wallet className="h-4 w-4 text-[#4CC38A]" /> Solde disponible
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {solde ? formatMontant(solde.soldeDisponible ?? solde.solde) : '—'}
          </p>
        </div>

        <div className="rounded-2xl border border-[#F3921F]/25 bg-black/20 p-6 backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
            <Lock className="h-4 w-4 text-[#F3921F]" /> Fonds réservés
          </div>
          <p className="mt-3 text-3xl font-black text-white">
            {solde ? formatMontant(solde.soldeReserve) : '—'}
          </p>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setFormulaire('instruction')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18]"
        >
          <Plus className="h-4 w-4" /> Instruction de paiement
        </button>
        <button
          type="button"
          onClick={() => setFormulaire('reservation')}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-white/30 hover:text-white"
        >
          <Lock className="h-4 w-4" /> Réserver des fonds
        </button>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        {[
          { cle: 'operations', label: `Opérations (${operations.length})` },
          { cle: 'instructions', label: `Instructions (${instructions.length})` },
          { cle: 'reservations', label: `Réservations (${reservations.length})` },
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

      {/* Contenu */}
      {chargement ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : onglet === 'operations' ? (
        operations.length === 0 ? (
          <VideMessage texte="Aucune opération enregistrée sur ce compte." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {operations.map((op) => {
              const credit = estCredit(op);
              return (
                <div key={op.id} className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      {credit ? (
                        <ArrowDownLeft className="h-4 w-4 text-[#4CC38A]" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-[#F3921F]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{op.type.replaceAll('_', ' ')}</p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {op.description || op.sousType?.replaceAll('_', ' ') || '—'}
                        {op.dossierRef ? ` · ${op.dossierRef}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${credit ? 'text-[#4CC38A]' : 'text-[#F3921F]'}`}>
                      {credit ? '+' : '−'} {formatMontant(op.montant)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      {formatDate(op.createdAt)} · solde {formatMontant(op.soldeApres)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : onglet === 'instructions' ? (
        instructions.length === 0 ? (
          <VideMessage texte="Aucune instruction de paiement." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {instructions.map((i) => (
              <div key={i.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Landmark className="h-4 w-4 text-[#3C9AB7]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{i.reference}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {formatMontant(i.montant)} · {i.methode?.replaceAll('_', ' ')}
                      {i.partenaire ? ` · ${i.partenaire}` : ''}
                    </p>
                    {i.motifRejet && (
                      <p className="mt-0.5 text-[10px] font-bold uppercase text-red-400">Motif : {i.motifRejet}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-16 lg:pl-0">
                  <Badge statut={i.statut} table={STATUTS_INSTRUCTION} />

                  {i.statut === 'DEMANDE' && (
                    <BoutonAction
                      libelle="Transmettre"
                      occupe={action === `t-${i.id}`}
                      onClick={() => executer(`t-${i.id}`, () => CompteAPI.transmettreInstruction(i.id))}
                    />
                  )}
                  {i.statut === 'TRANSMISE' && (
                    <BoutonAction
                      libelle="Mettre en traitement"
                      occupe={action === `p-${i.id}`}
                      onClick={() => executer(`p-${i.id}`, () => CompteAPI.traiterInstruction(i.id))}
                    />
                  )}
                  {i.statut === 'EN_TRAITEMENT' && (
                    <>
                      <BoutonAction
                        libelle="Valider"
                        icone={CheckCircle2}
                        couleur="text-[#4CC38A] border-[#4CC38A]/40 hover:bg-[#4CC38A]/10"
                        occupe={action === `v-${i.id}`}
                        onClick={() => executer(`v-${i.id}`, () => CompteAPI.validerInstruction(i.id))}
                      />
                      <BoutonAction
                        libelle="Refuser"
                        icone={XCircle}
                        couleur="text-red-300 border-red-500/40 hover:bg-red-500/10"
                        occupe={action === `r-${i.id}`}
                        onClick={() =>
                          executer(`r-${i.id}`, () =>
                            CompteAPI.refuserInstruction(i.id, 'Refusée par le partenaire financier'),
                          )
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : reservations.length === 0 ? (
        <VideMessage texte="Aucune réservation de fonds." />
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {reservations.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Lock className="h-4 w-4 text-[#F3921F]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{formatMontant(r.montant)}</p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {r.motif || '—'}
                    {r.dossierRef ? ` · ${r.dossierRef}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-16 lg:pl-0">
                <Badge statut={r.statut} table={STATUTS_RESERVATION} />

                {r.statut === 'ACTIVE' && (
                  <>
                    <BoutonAction
                      libelle="Libérer"
                      occupe={action === `l-${r.id}`}
                      onClick={() => executer(`l-${r.id}`, () => CompteAPI.libererReservation(r.id))}
                    />
                    <BoutonAction
                      libelle="Consommer"
                      couleur="text-[#4CC38A] border-[#4CC38A]/40 hover:bg-[#4CC38A]/10"
                      occupe={action === `c-${r.id}`}
                      onClick={() => executer(`c-${r.id}`, () => CompteAPI.consommerReservation(r.id))}
                    />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideMessage({ texte }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
      <Inbox className="h-10 w-10 text-white/20" />
      <p className="mt-4 text-sm font-bold text-white/60">{texte}</p>
    </div>
  );
}

function BoutonAction({ libelle, onClick, occupe, icone: Icone, couleur }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={occupe}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
        couleur || 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
      }`}
    >
      {Icone && <Icone className="h-3.5 w-3.5" />}
      {occupe ? '…' : libelle}
    </button>
  );
}