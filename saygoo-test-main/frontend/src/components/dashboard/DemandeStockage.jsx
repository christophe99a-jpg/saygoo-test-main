import React, { useEffect, useState, useCallback } from 'react';
import {
  Warehouse, RefreshCw, MapPin, Thermometer, ShieldCheck, Package,
  AlertTriangle, Inbox, ArrowLeft, X,
} from 'lucide-react';
import { OperateurAPI } from '../../lib/apiF';

const STATUTS = {
  NOUVEAU: { label: 'Nouvelle', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  ACCEPTE: { label: 'Acceptée', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  STOCKE: { label: 'Stockée', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  LIBERE: { label: 'Libérée', classe: 'bg-white/10 text-white/50 border-white/20' },
  REFUSE: { label: 'Refusée', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const formatNombre = (v) => (v == null ? '—' : Number(v).toLocaleString('fr-FR'));

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

// ── Formulaire de demande ───────────────────────────────────────────────────────
function FormulaireDemande({ entrepot, onAnnuler, onSucces }) {
  const [typeStockage, setTypeStockage] = useState('CONTENEUR');
  const [marchandise, setMarchandise] = useState('');
  const [quantite, setQuantite] = useState('');
  const [uniteQuantite, setUniteQuantite] = useState('Conteneurs');
  const [dureeEstimeeJours, setDuree] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [dossierRef, setDossierRef] = useState('');
  const [observations, setObservations] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  // L'unité suit le type choisi, sauf si l'utilisateur l'a modifiée lui-même.
  const changerType = (valeur) => {
    setTypeStockage(valeur);
    setUniteQuantite(valeur === 'VRAC' ? 'Tonnes' : 'Conteneurs');
  };

  const valider = async () => {
    if (!marchandise.trim()) {
      setErreur('Précisez la nature de la marchandise.');
      return;
    }

    setEnvoi(true);
    setErreur(null);

    try {
      const reponse = await OperateurAPI.creerDemandeStockage({
        warehouseId: entrepot.id,
        typeStockage,
        marchandise: marchandise.trim(),
        quantite: quantite ? Number(quantite) : undefined,
        uniteQuantite,
        dureeEstimeeJours: dureeEstimeeJours ? Number(dureeEstimeeJours) : undefined,
        entreprise: entreprise.trim() || undefined,
        telephone: telephone.trim() || undefined,
        dossierRef: dossierRef.trim() || undefined,
        observations: observations.trim() || undefined,
      });
      onSucces(reponse.data);
    } catch (err) {
      setErreur(
        err.status === 503
          ? "Le service Entrepôt est momentanément indisponible."
          : err.message || "La demande n'a pas pu être enregistrée."
      );
    } finally {
      setEnvoi(false);
    }
  };

  const champ =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F36F21]';
  const libelle = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45';

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-black uppercase text-white">{entrepot.name}</h3>
          <p className="mt-1 text-xs text-white/45">
            {entrepot.distanceFromPortKm != null && `${entrepot.distanceFromPortKm} km du Port · `}
            {entrepot.tarifStockageParTonneJour
              ? `${formatNombre(entrepot.tarifStockageParTonneJour)} XOF / tonne / jour`
              : 'Tarif sur demande'}
          </p>
        </div>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6">
        <span className={libelle}>Type de stockage</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { cle: 'CONTENEUR', titre: 'Conteneurs', detail: 'Unités 20 ou 40 pieds' },
            { cle: 'VRAC', titre: 'Vrac', detail: 'Marchandise en tonnage' },
          ].map((option) => (
            <button
              key={option.cle}
              type="button"
              onClick={() => changerType(option.cle)}
              className={`rounded-xl border p-4 text-left transition-all ${
                typeStockage === option.cle
                  ? 'border-[#F36F21] bg-[#F36F21]/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <p className="text-xs font-black uppercase text-white">{option.titre}</p>
              <p className="mt-1 text-[10px] text-white/45">{option.detail}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={libelle} htmlFor="marchandise">Nature de la marchandise *</label>
          <input id="marchandise" className={champ} value={marchandise} onChange={(e) => setMarchandise(e.target.value)} placeholder="Clinker, riz, pièces détachées…" />
        </div>
        <div>
          <label className={libelle} htmlFor="quantite">Quantité</label>
          <input id="quantite" type="number" min="0" className={champ} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="unite">Unité</label>
          <input id="unite" className={champ} value={uniteQuantite} onChange={(e) => setUniteQuantite(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="duree">Durée estimée (jours)</label>
          <input id="duree" type="number" min="1" className={champ} value={dureeEstimeeJours} onChange={(e) => setDuree(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="dossierRef">Référence dossier (facultatif)</label>
          <input id="dossierRef" className={champ} value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} placeholder="DD-2026-000001" />
        </div>
        <div>
          <label className={libelle} htmlFor="entreprise">Entreprise</label>
          <input id="entreprise" className={champ} value={entreprise} onChange={(e) => setEntreprise(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="tel">Téléphone</label>
          <input id="tel" className={champ} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className={libelle} htmlFor="obs">Observations</label>
          <textarea id="obs" rows={2} className={champ} value={observations} onChange={(e) => setObservations(e.target.value)} />
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
        className="mt-6 w-full rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-[#d95f18] disabled:opacity-50"
      >
        {envoi ? 'Envoi en cours…' : 'Soumettre la demande'}
      </button>
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function DemandeStockage() {
  const [onglet, setOnglet] = useState('entrepots');
  const [entrepots, setEntrepots] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [entrepotChoisi, setEntrepotChoisi] = useState(null);
  const [demandeCreee, setDemandeCreee] = useState(null);

  const messageErreur = (err, defaut) =>
    err.status === 503 ? 'Le service Entrepôt est momentanément indisponible.' : err.message || defaut;

  const chargerEntrepots = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await OperateurAPI.entrepotsDisponibles();
      setEntrepots(reponse.data?.entrepots ?? []);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les entrepôts.'));
      setEntrepots([]);
    } finally {
      setChargement(false);
    }
  }, []);

  const chargerDemandes = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await OperateurAPI.mesDemandesStockage();
      setDemandes(reponse.data?.demandes ?? []);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger vos demandes.'));
      setDemandes([]);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    if (onglet === 'entrepots') chargerEntrepots();
    else chargerDemandes();
  }, [onglet, chargerEntrepots, chargerDemandes]);

  // ─── Confirmation ───────────────────────────────────────────────────
  if (demandeCreee) {
    return (
      <div className="rounded-2xl border border-[#4CC38A]/30 bg-black/20 p-10 text-center backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4CC38A]">Demande transmise</p>
        <h2 className="mt-3 text-3xl font-black italic tracking-tighter text-white">{demandeCreee.reference}</h2>
        <p className="mt-4 text-xs text-white/45">
          L&apos;exploitant de l&apos;entrepôt va l&apos;étudier et vous affecter un emplacement.
        </p>
        <button
          type="button"
          onClick={() => {
            setDemandeCreee(null);
            setEntrepotChoisi(null);
            setOnglet('demandes');
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Voir mes demandes
        </button>
      </div>
    );
  }

  // ─── Formulaire ─────────────────────────────────────────────────────
  if (entrepotChoisi) {
    return (
      <FormulaireDemande
        entrepot={entrepotChoisi}
        onAnnuler={() => setEntrepotChoisi(null)}
        onSucces={setDemandeCreee}
      />
    );
  }

  const rafraichir = () => (onglet === 'entrepots' ? chargerEntrepots() : chargerDemandes());

  // ─── Vue principale ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Stockage sous douane</h2>
          <p className="mt-1 text-sm text-white/50">Choisissez un entrepôt et suivez vos demandes.</p>
        </div>
        <button
          type="button"
          onClick={rafraichir}
          disabled={chargement}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="flex gap-2">
        {[
          { cle: 'entrepots', label: 'Entrepôts disponibles' },
          { cle: 'demandes', label: 'Mes demandes' },
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

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {chargement ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : onglet === 'entrepots' ? (
        entrepots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
            <Inbox className="h-10 w-10 text-white/20" />
            <p className="mt-4 text-sm font-bold text-white/60">Aucun entrepôt disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {entrepots.map((e) => (
              <div key={e.id} className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md transition-colors hover:border-white/20">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Warehouse className="h-5 w-5 text-[#3C9AB7]" />
                  </div>
                  {e.distanceFromPortKm != null && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-white/40">
                      <MapPin className="h-3 w-3" /> {e.distanceFromPortKm} km du Port
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-black uppercase text-white">{e.name}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{e.type}</p>

                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold uppercase text-white/45">
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3 w-3" /> {formatNombre(e.capacity_available)} m² libres
                  </span>
                  {e.temperature_type && (
                    <span className="inline-flex items-center gap-1">
                      <Thermometer className="h-3 w-3" /> {e.temperature_type}
                    </span>
                  )}
                  {e.security_level != null && (
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Niveau {e.security_level}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm font-black text-[#F36F21]">
                  {e.tarifStockageParTonneJour
                    ? `${formatNombre(e.tarifStockageParTonneJour)} XOF / tonne / jour`
                    : 'Tarif sur demande'}
                </p>

                <button
                  type="button"
                  onClick={() => setEntrepotChoisi(e)}
                  className="mt-5 w-full rounded-xl bg-[#F36F21] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#d95f18]"
                >
                  Demander un stockage
                </button>
              </div>
            ))}
          </div>
        )
      ) : demandes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
          <Inbox className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-bold text-white/60">Vous n&apos;avez encore aucune demande de stockage.</p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {demandes.map((d) => (
            <div key={d.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Warehouse className="h-4 w-4 text-[#3C9AB7]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{d.reference}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {d.marchandise}
                    {d.quantite ? ` · ${formatNombre(d.quantite)} ${d.uniteQuantite || ''}` : ''}
                  </p>
                  {d.emplacement && (
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4CC38A]">
                      Emplacement {d.emplacement.zone} / {d.emplacement.slot}
                    </p>
                  )}
                </div>
              </div>
              <div className="pl-16 sm:pl-0">
                <Badge statut={d.statut} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}