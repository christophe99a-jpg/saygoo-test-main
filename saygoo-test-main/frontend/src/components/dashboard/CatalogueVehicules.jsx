import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Car, Fuel, Gauge, AlertTriangle, Inbox, X, ArrowLeft } from 'lucide-react';
import { OperateurAPI } from '../../lib/apiF';

const STATUTS = {
  DISPONIBLE: { label: 'Disponible', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  RESERVE: { label: 'Réservé', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  VENDU: { label: 'Vendu', classe: 'bg-white/10 text-white/40 border-white/20' },
};

function formatPrix(valeur) {
  if (valeur == null) return '—';
  return `${Number(valeur).toLocaleString('fr-FR')} XOF`;
}

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

// ── Formulaire d'achat (Import ou Transit) ──────────────────────────────────────
function FormulaireAchat({ vehicule, onAnnuler, onSucces }) {
  const [typeAchat, setTypeAchat] = useState('IMPORT');
  const [entreprise, setEntreprise] = useState('');
  const [telephone, setTelephone] = useState('');
  const [assuranceDuree, setAssuranceDuree] = useState('12_MOIS');
  const [destinationPays, setDestinationPays] = useState('');
  const [destinationVille, setDestinationVille] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const valider = async () => {
    if (typeAchat === 'TRANSIT' && !destinationPays.trim()) {
      setErreur('Le pays de destination est obligatoire pour un transit.');
      return;
    }

    setEnvoi(true);
    setErreur(null);

    try {
      const reponse = await OperateurAPI.acheterVehicule(vehicule.id, {
        typeAchat,
        entreprise: entreprise.trim() || undefined,
        telephone: telephone.trim() || undefined,
        assuranceDuree: typeAchat === 'IMPORT' ? assuranceDuree : undefined,
        destinationPays: typeAchat === 'TRANSIT' ? destinationPays.trim() : undefined,
        destinationVille: typeAchat === 'TRANSIT' ? destinationVille.trim() || undefined : undefined,
      });
      onSucces(reponse.data);
    } catch (err) {
      setErreur(
        err.status === 503
          ? 'Le service véhicules est momentanément indisponible.'
          : err.message || "L'achat n'a pas pu être enregistré."
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
          <h3 className="text-lg font-black uppercase text-white">
            {vehicule.marque} {vehicule.modele}
          </h3>
          <p className="mt-1 text-sm text-[#F36F21]">{formatPrix(vehicule.prix)}</p>
        </div>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-6">
        <span className={libelle}>Type d&apos;achat</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { cle: 'IMPORT', titre: 'Import au Togo', detail: 'Dédouanement, assurance, immatriculation' },
            { cle: 'TRANSIT', titre: 'Transit sous-région', detail: 'Déclaration transit et laisser-passer' },
          ].map((option) => (
            <button
              key={option.cle}
              type="button"
              onClick={() => setTypeAchat(option.cle)}
              className={`rounded-xl border p-4 text-left transition-all ${
                typeAchat === option.cle
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
        <div>
          <label className={libelle} htmlFor="entreprise">Entreprise (facultatif)</label>
          <input id="entreprise" className={champ} value={entreprise} onChange={(e) => setEntreprise(e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="telephone">Téléphone</label>
          <input id="telephone" className={champ} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        </div>

        {typeAchat === 'IMPORT' ? (
          <div className="sm:col-span-2">
            <span className={libelle}>Durée d&apos;assurance</span>
            <div className="flex gap-3">
              {[
                { cle: '6_MOIS', label: '6 mois' },
                { cle: '12_MOIS', label: '12 mois' },
              ].map((option) => (
                <button
                  key={option.cle}
                  type="button"
                  onClick={() => setAssuranceDuree(option.cle)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-xs font-black uppercase transition-all ${
                    assuranceDuree === option.cle
                      ? 'border-[#F36F21] bg-[#F36F21]/10 text-[#F36F21]'
                      : 'border-white/10 text-white/50 hover:border-white/25'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className={libelle} htmlFor="pays">Pays de destination *</label>
              <input id="pays" className={champ} value={destinationPays} onChange={(e) => setDestinationPays(e.target.value)} placeholder="Burkina Faso" />
            </div>
            <div>
              <label className={libelle} htmlFor="ville">Ville de destination</label>
              <input id="ville" className={champ} value={destinationVille} onChange={(e) => setDestinationVille(e.target.value)} placeholder="Ouagadougou" />
            </div>
          </>
        )}
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
        {envoi ? 'Enregistrement…' : "Confirmer l'achat"}
      </button>
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function CatalogueVehicules() {
  const [vehicules, setVehicules] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [vehiculeAchat, setVehiculeAchat] = useState(null);
  const [achatConfirme, setAchatConfirme] = useState(null);

  const charger = useCallback(async (terme) => {
    setChargement(true);
    setErreur(null);

    try {
      const reponse = await OperateurAPI.catalogueVehicules(terme || undefined);
      setVehicules(reponse.data?.vehicules ?? []);
    } catch (err) {
      setErreur(
        err.status === 503
          ? 'Le service véhicules est momentanément indisponible.'
          : err.message || 'Impossible de charger le parc.'
      );
      setVehicules([]);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const reserver = async (id) => {
    try {
      await OperateurAPI.reserverVehicule(id);
      charger(recherche);
    } catch (err) {
      setErreur(err.message || 'La réservation a échoué.');
    }
  };

  // ─── Confirmation d'achat ───────────────────────────────────────────
  if (achatConfirme) {
    const { vente, dossier } = achatConfirme;
    return (
      <div className="rounded-2xl border border-[#4CC38A]/30 bg-black/20 p-10 text-center backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4CC38A]">Achat enregistré</p>
        <h2 className="mt-3 text-3xl font-black italic tracking-tighter text-white">{vente?.reference}</h2>

        {dossier?.reference && (
          <p className="mt-4 text-sm text-white/60">
            Dossier douanier créé automatiquement :{' '}
            <span className="font-black text-[#F36F21]">{dossier.reference}</span>
          </p>
        )}

        <p className="mt-2 text-xs text-white/40">
          Retrouvez l&apos;avancement dans « Suivi de mes demandes ».
        </p>

        <button
          type="button"
          onClick={() => {
            setAchatConfirme(null);
            setVehiculeAchat(null);
            charger(recherche);
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au parc
        </button>
      </div>
    );
  }

  // ─── Formulaire d'achat ─────────────────────────────────────────────
  if (vehiculeAchat) {
    return (
      <FormulaireAchat
        vehicule={vehiculeAchat}
        onAnnuler={() => setVehiculeAchat(null)}
        onSucces={setAchatConfirme}
      />
    );
  }

  // ─── Catalogue ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Parc à véhicules sous douane</h2>
          <p className="text-sm text-white/50">Achetez un véhicule et lancez les formalités en une opération.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && charger(recherche)}
              placeholder="Marque, modèle ou lot…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-[#F36F21]"
            />
          </div>
          <button
            type="button"
            onClick={() => charger(recherche)}
            disabled={chargement}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
            Rechercher
          </button>
        </div>
      </div>

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {chargement && vehicules.length === 0 ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : vehicules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
          <Inbox className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-bold text-white/60">
            {recherche ? `Aucun véhicule ne correspond à « ${recherche} ».` : 'Aucun véhicule au parc pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vehicules.map((v) => {
            const indisponible = v.statut === 'VENDU';

            return (
              <div
                key={v.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Car className="h-5 w-5 text-[#F36F21]" />
                  </div>
                  <Badge statut={v.statut} />
                </div>

                <h3 className="mt-4 text-base font-black uppercase text-white">
                  {v.marque} {v.modele}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Lot {v.lot} · {v.annee}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-[10px] font-bold uppercase text-white/45">
                  {v.energie && (
                    <span className="inline-flex items-center gap-1">
                      <Fuel className="h-3 w-3" /> {v.energie}
                    </span>
                  )}
                  {v.kilometrage != null && (
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> {Number(v.kilometrage).toLocaleString('fr-FR')} km
                    </span>
                  )}
                  {v.couleur && <span>{v.couleur}</span>}
                </div>

                <p className="mt-4 text-xl font-black text-[#F36F21]">{formatPrix(v.prix)}</p>

                <div className="mt-5 flex gap-2">
                  {v.statut === 'DISPONIBLE' && (
                    <button
                      type="button"
                      onClick={() => reserver(v.id)}
                      className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:border-white/30 hover:text-white"
                    >
                      Réserver
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVehiculeAchat(v)}
                    disabled={indisponible}
                    className="flex-1 rounded-xl bg-[#F36F21] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-[#d95f18] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    {indisponible ? 'Vendu' : 'Acheter'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}