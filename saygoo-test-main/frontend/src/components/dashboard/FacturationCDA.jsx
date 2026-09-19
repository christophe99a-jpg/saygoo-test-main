import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Search, Receipt, AlertTriangle, Inbox, ArrowLeft,
  Plus, Trash2, Send, CheckCircle2, Calculator,
} from 'lucide-react';
import { FactureAPI } from '../../lib/apiF';

const STATUTS = {
  BROUILLON: { label: 'Brouillon', classe: 'bg-white/10 text-white/60 border-white/20' },
  EMISE: { label: 'Émise', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  PAYEE: { label: 'Payée', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
};

// Postes de facturation prévus par le back-end
const TYPES_LIGNE = [
  { cle: 'CONSIGNATION', label: 'Consignataire' },
  { cle: 'TERMINAL', label: 'Terminal portuaire' },
  { cle: 'PAL', label: 'Port Autonome de Lomé' },
  { cle: 'DOUANE_OTR', label: 'Douane / OTR' },
  { cle: 'CHAMBRE_COMMERCE', label: 'Chambre de commerce' },
  { cle: 'ANTASER', label: 'ANTASER' },
  { cle: 'SEGUCE', label: 'SEGUCE' },
  { cle: 'HONORAIRE_TRANSITAIRE', label: 'Honoraire transitaire' },
  { cle: 'AUTRE', label: 'Autre' },
];

// Barème d'auto-calcul de l'honoraire transitaire
const CARGAISONS = [
  { cle: 'CONTENEUR_20', label: "Conteneur 20'" },
  { cle: 'CONTENEUR_40', label: "Conteneur 40'" },
  { cle: 'VEHICULE', label: 'Véhicule' },
  { cle: 'VRAC', label: 'Vrac / MAD' },
];

const CATEGORIES_VEHICULE = [
  { cle: 'CATEGORIE_A', label: 'Catégorie A (motos)' },
  { cle: 'CATEGORIE_B', label: 'Catégorie B' },
  { cle: 'CATEGORIE_C', label: 'Catégorie C' },
];

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
  err.status === 503 ? 'Le service Facturation est momentanément indisponible.' : err.message || defaut;

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

// ── Ajout d'une ligne, avec calcul automatique pour l'honoraire ────────────────
function AjoutLigne({ factureId, onAjoute }) {
  const [type, setType] = useState('CONSIGNATION');
  const [libelleLigne, setLibelleLigne] = useState('');
  const [montant, setMontant] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [calculAuto, setCalculAuto] = useState(true);
  const [typeCargaison, setTypeCargaison] = useState('CONTENEUR_20');
  const [typeVehicule, setTypeVehicule] = useState('CATEGORIE_B');
  const [equivalentVrac, setEquivalentVrac] = useState('20');
  const [apercu, setApercu] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const estHonoraire = type === 'HONORAIRE_TRANSITAIRE';
  const enAuto = estHonoraire && calculAuto;

  // Le montant de l'honoraire vient du barème : on l'affiche avant d'ajouter.
  useEffect(() => {
    if (!enAuto) {
      setApercu(null);
      return;
    }
    let annule = false;
    FactureAPI.simulerHonoraire({
      typeMarchandise: typeCargaison === 'VEHICULE' ? 'VEHICULE' : typeCargaison,
      typeVehicule: typeCargaison === 'VEHICULE' ? typeVehicule : undefined,
      equivalentVrac: typeCargaison === 'VRAC' ? equivalentVrac : undefined,
      quantite: quantite || 1,
    })
      .then((r) => !annule && setApercu(r.data?.montant ?? null))
      .catch(() => !annule && setApercu(null));
    return () => {
      annule = true;
    };
  }, [enAuto, typeCargaison, typeVehicule, equivalentVrac, quantite]);

  const ajouter = async () => {
    if (!enAuto && (!montant || Number(montant) <= 0)) {
      setErreur('Renseignez un montant supérieur à 0.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      await FactureAPI.ajouterLigne(factureId, {
        type,
        libelle: libelleLigne.trim() || undefined,
        quantite: Number(quantite) || 1,
        montant: enAuto ? undefined : Number(montant),
        calculAuto: enAuto,
        typeMarchandise: enAuto ? (typeCargaison === 'VEHICULE' ? 'VEHICULE' : typeCargaison) : undefined,
        typeVehicule: enAuto && typeCargaison === 'VEHICULE' ? typeVehicule : undefined,
        equivalentVrac: enAuto && typeCargaison === 'VRAC' ? equivalentVrac : undefined,
      });
      setMontant('');
      setLibelleLigne('');
      onAjoute();
    } catch (err) {
      setErreur(messageErreur(err, "La ligne n'a pas pu être ajoutée."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
      <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Ajouter une ligne</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={libelle} htmlFor="type-ligne">Poste</label>
          <select id="type-ligne" className={champ} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES_LIGNE.map((t) => (
              <option key={t.cle} value={t.cle} className="bg-[#1B1B1B]">{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={libelle} htmlFor="lib-ligne">Libellé (facultatif)</label>
          <input id="lib-ligne" className={champ} value={libelleLigne} onChange={(e) => setLibelleLigne(e.target.value)} />
        </div>
      </div>

      {estHonoraire && (
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
          <input type="checkbox" checked={calculAuto} onChange={(e) => setCalculAuto(e.target.checked)} className="h-4 w-4 accent-[#F36F21]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
            Calculer automatiquement selon le barème SAYGOO
          </span>
        </label>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {enAuto ? (
          <>
            <div>
              <label className={libelle} htmlFor="cargaison">Type de cargaison</label>
              <select id="cargaison" className={champ} value={typeCargaison} onChange={(e) => setTypeCargaison(e.target.value)}>
                {CARGAISONS.map((c) => (
                  <option key={c.cle} value={c.cle} className="bg-[#1B1B1B]">{c.label}</option>
                ))}
              </select>
            </div>

            {typeCargaison === 'VEHICULE' && (
              <div>
                <label className={libelle} htmlFor="cat-veh">Catégorie</label>
                <select id="cat-veh" className={champ} value={typeVehicule} onChange={(e) => setTypeVehicule(e.target.value)}>
                  {CATEGORIES_VEHICULE.map((c) => (
                    <option key={c.cle} value={c.cle} className="bg-[#1B1B1B]">{c.label}</option>
                  ))}
                </select>
              </div>
            )}

            {typeCargaison === 'VRAC' && (
              <div>
                <label className={libelle} htmlFor="equiv">Poids équivalent</label>
                <select id="equiv" className={champ} value={equivalentVrac} onChange={(e) => setEquivalentVrac(e.target.value)}>
                  <option value="20" className="bg-[#1B1B1B]">Équivalent 20 pieds</option>
                  <option value="40" className="bg-[#1B1B1B]">Équivalent 40 pieds</option>
                </select>
              </div>
            )}
          </>
        ) : (
          <div>
            <label className={libelle} htmlFor="montant-ligne">Montant (XOF) *</label>
            <input id="montant-ligne" type="number" min="0" className={champ} value={montant} onChange={(e) => setMontant(e.target.value)} />
          </div>
        )}

        <div>
          <label className={libelle} htmlFor="qte">Quantité</label>
          <input id="qte" type="number" min="1" className={champ} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
        </div>
      </div>

      {enAuto && apercu != null && (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#F36F21]/30 bg-[#F36F21]/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-[#F36F21]">
          <Calculator className="h-4 w-4" /> Montant calculé : {formatMontant(apercu)}
        </p>
      )}

      {erreur && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
          {erreur}
        </p>
      )}

      <button
        type="button"
        onClick={ajouter}
        disabled={envoi}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> {envoi ? 'Ajout…' : 'Ajouter la ligne'}
      </button>
    </div>
  );
}

// ── Détail d'une facture ────────────────────────────────────────────────────────
function FicheFacture({ factureId, onRetour, onModifie }) {
  const [facture, setFacture] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [action, setAction] = useState(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await FactureAPI.detail(factureId);
      setFacture(reponse.data?.facture ?? null);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger la facture.'));
    } finally {
      setChargement(false);
    }
  }, [factureId]);

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

  if (chargement) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-sm font-bold text-red-300">{erreur || 'Facture introuvable.'}</p>
        <button type="button" onClick={onRetour} className="mt-4 text-[10px] font-black uppercase tracking-widest text-white/70 underline">
          Retour à la liste
        </button>
      </div>
    );
  }

  const brouillon = facture.statut === 'BROUILLON';

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onRetour}
        className="inline-flex items-center gap-2 self-start text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Retour à la liste
      </button>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">{facture.reference}</h2>
            <p className="mt-1 text-sm text-white/55">
              {facture.clientNom}
              {facture.dossierRef ? ` · ${facture.dossierRef}` : ''}
            </p>
          </div>
          <div className="text-right">
            <Badge statut={facture.statut} />
            <p className="mt-3 text-2xl font-black text-[#F36F21]">{formatMontant(facture.montantTotal)}</p>
          </div>
        </div>
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {/* Lignes */}
      <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
        <div className="border-b border-white/5 p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">
            Lignes ({facture.lignes?.length ?? 0})
          </h3>
        </div>

        {!facture.lignes?.length ? (
          <p className="p-8 text-center text-xs font-bold uppercase tracking-widest text-white/35">
            Aucune ligne — la facture ne peut pas être émise
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {facture.lignes.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-black text-white">{l.libelle}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                    {TYPES_LIGNE.find((t) => t.cle === l.type)?.label || l.type}
                    {l.quantite > 1 ? ` · ×${l.quantite}` : ''}
                    {l.calculAuto ? ' · calculé automatiquement' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm font-black text-white">{formatMontant(l.montant)}</p>
                  {brouillon && (
                    <button
                      type="button"
                      onClick={() => executer(`d-${l.id}`, () => FactureAPI.supprimerLigne(facture.id, l.id))}
                      disabled={Boolean(action)}
                      className="rounded-lg border border-red-500/30 p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {brouillon && <AjoutLigne factureId={facture.id} onAjoute={() => { charger(); onModifie?.(); }} />}

      {/* Workflow */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-white">Workflow</h3>
        <div className="flex flex-wrap gap-3">
          {brouillon && (
            <button
              type="button"
              onClick={() => executer('emettre', () => FactureAPI.emettre(facture.id))}
              disabled={Boolean(action) || !facture.lignes?.length}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-30"
            >
              <Send className="h-4 w-4" /> {action === 'emettre' ? 'Émission…' : 'Émettre la facture'}
            </button>
          )}

          {facture.statut === 'EMISE' && (
            <button
              type="button"
              onClick={() => executer('payer', () => FactureAPI.marquerPayee(facture.id))}
              disabled={Boolean(action)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#4CC38A]/40 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[#4CC38A] hover:bg-[#4CC38A]/10 disabled:opacity-30"
            >
              <CheckCircle2 className="h-4 w-4" /> {action === 'payer' ? 'Validation…' : 'Marquer payée'}
            </button>
          )}

          {facture.statut === 'PAYEE' && (
            <p className="text-xs font-bold uppercase tracking-widest text-[#4CC38A]">Facture réglée</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Création d'une facture ──────────────────────────────────────────────────────
function FormulaireFacture({ onAnnuler, onSucces }) {
  const [clientNom, setClientNom] = useState('');
  const [dossierRef, setDossierRef] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valider = async () => {
    if (!clientNom.trim()) {
      setErreur('Le nom du client est obligatoire.');
      return;
    }
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await FactureAPI.creer({
        clientNom: clientNom.trim(),
        dossierRef: dossierRef.trim() || undefined,
      });
      onSucces(reponse.data?.facture);
    } catch (err) {
      setErreur(messageErreur(err, "La facture n'a pas pu être créée."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <h3 className="mb-5 text-sm font-black uppercase tracking-widest text-white">Nouvelle facture</h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={libelle} htmlFor="client">Client *</label>
          <input id="client" className={champ} value={clientNom} onChange={(e) => setClientNom(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="dossier">Référence dossier / BL</label>
          <input id="dossier" className={champ} value={dossierRef} onChange={(e) => setDossierRef(e.target.value)} placeholder="DD-2026-000001" />
        </div>
      </div>

      {erreur && (
        <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300">
          {erreur}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={valider}
          disabled={envoi}
          className="flex-1 rounded-xl bg-[#F36F21] px-6 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-50"
        >
          {envoi ? 'Création…' : 'Créer le brouillon'}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="rounded-xl border border-white/15 px-6 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function FacturationCDA() {
  const [factures, setFactures] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('');
  const [factureOuverte, setFactureOuverte] = useState(null);
  const [creation, setCreation] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await FactureAPI.lister({
        search: recherche || undefined,
        statut: filtre || undefined,
      });
      setFactures(reponse.data?.factures ?? []);
    } catch (err) {
      setErreur(messageErreur(err, 'Impossible de charger les factures.'));
      setFactures([]);
    } finally {
      setChargement(false);
    }
  }, [recherche, filtre]);

  useEffect(() => {
    charger();
  }, [filtre, charger]);

  if (factureOuverte) {
    return (
      <FicheFacture
        factureId={factureOuverte}
        onRetour={() => {
          setFactureOuverte(null);
          charger();
        }}
        onModifie={charger}
      />
    );
  }

  if (creation) {
    return (
      <FormulaireFacture
        onAnnuler={() => setCreation(false)}
        onSucces={(facture) => {
          setCreation(false);
          setFactureOuverte(facture?.id ?? null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Facturation</h2>
            <p className="mt-1 text-sm text-white/50">
              Factures multi-postes avec honoraire transitaire calculé automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreation(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18]"
          >
            <Plus className="h-4 w-4" /> Nouvelle facture
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && charger()}
              placeholder="Référence, client, dossier…"
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
          {[
            { cle: '', label: 'Toutes' },
            { cle: 'BROUILLON', label: 'Brouillons' },
            { cle: 'EMISE', label: 'Émises' },
            { cle: 'PAYEE', label: 'Payées' },
          ].map((f) => (
            <button
              key={f.cle || 'tous'}
              type="button"
              onClick={() => setFiltre(f.cle)}
              className={`rounded-lg border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
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

      {chargement && factures.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : factures.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
          <Inbox className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-bold text-white/60">
            {recherche || filtre ? 'Aucune facture ne correspond à ces critères.' : 'Aucune facture émise pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {factures.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFactureOuverte(f.id)}
              className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Receipt className="h-4 w-4 text-[#F36F21]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{f.reference}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {f.clientNom}
                    {f.dossierRef ? ` · ${f.dossierRef}` : ''}
                    {f.lignes?.length ? ` · ${f.lignes.length} ligne(s)` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pl-16 sm:pl-0">
                <div className="text-right">
                  <p className="text-sm font-black text-white">{formatMontant(f.montantTotal)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                    {formatDate(f.createdAt)}
                  </p>
                </div>
                <Badge statut={f.statut} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}