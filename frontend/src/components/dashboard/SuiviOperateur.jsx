import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, FileText, Warehouse, Car, AlertTriangle, Inbox } from 'lucide-react';
import { OperateurAPI } from '../../lib/apiF';

// Apparence par type de demande
const TYPES = {
  DEDOUANEMENT: { label: 'Dédouanement', Icone: FileText, couleur: 'text-[#F36F21]' },
  STOCKAGE: { label: 'Stockage', Icone: Warehouse, couleur: 'text-[#3C9AB7]' },
  VEHICULE: { label: 'Véhicule', Icone: Car, couleur: 'text-[#4CC38A]' },
};

// Apparence par statut global (normalisé côté back-end)
const STATUTS = {
  EN_ATTENTE: { label: 'En attente', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  EN_COURS: { label: 'En cours', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  TERMINE: { label: 'Terminé', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  ANNULE: { label: 'Annulé', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const FILTRES = ['TOUT', 'EN_ATTENTE', 'EN_COURS', 'TERMINE', 'ANNULE'];

function formaterDate(valeur) {
  if (!valeur) return '—';
  try {
    return new Date(valeur).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function Compteur({ label, valeur, actif, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        actif
          ? 'border-[#F36F21]/50 bg-[#F36F21]/10'
          : 'border-white/10 bg-black/20 hover:border-white/25'
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{valeur}</p>
    </button>
  );
}

export default function SuiviOperateur() {
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [filtre, setFiltre] = useState('TOUT');

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    try {
      const reponse = await OperateurAPI.suiviGlobal();
      setDonnees(reponse.data);
    } catch (err) {
      setErreur(
        err.status === 503
          ? "Le service de suivi est momentanément indisponible."
          : err.message || 'Impossible de charger vos demandes.'
      );
      setDonnees(null);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const demandes = donnees?.demandes ?? [];
  const resume = donnees?.resume;

  const demandesAffichees =
    filtre === 'TOUT' ? demandes : demandes.filter((d) => d.statutGlobal === filtre);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">
            Suivi de mes demandes
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Dédouanement, stockage et véhicules réunis en une seule vue.
          </p>
        </div>

        <button
          type="button"
          onClick={charger}
          disabled={chargement}
          className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 transition-all hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Avertissement en cas de données partielles */}
      {donnees?.avertissement && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F3921F]/30 bg-[#F3921F]/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F3921F]" />
          <p className="text-xs font-bold text-[#F3921F]">{donnees.avertissement}</p>
        </div>
      )}

      {/* Erreur bloquante */}
      {erreur && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-xs font-bold text-red-300">{erreur}</p>
          <button
            type="button"
            onClick={charger}
            className="text-[10px] font-black uppercase tracking-widest text-red-300 underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Compteurs cliquables (servent aussi de filtres) */}
      {resume && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Compteur label="Total" valeur={resume.total} actif={filtre === 'TOUT'} onClick={() => setFiltre('TOUT')} />
          <Compteur label="En attente" valeur={resume.enAttente} actif={filtre === 'EN_ATTENTE'} onClick={() => setFiltre('EN_ATTENTE')} />
          <Compteur label="En cours" valeur={resume.enCours} actif={filtre === 'EN_COURS'} onClick={() => setFiltre('EN_COURS')} />
          <Compteur label="Terminé" valeur={resume.termine} actif={filtre === 'TERMINE'} onClick={() => setFiltre('TERMINE')} />
          <Compteur label="Annulé" valeur={resume.annule} actif={filtre === 'ANNULE'} onClick={() => setFiltre('ANNULE')} />
        </div>
      )}

      {/* Liste des demandes */}
      <div className="rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
        {chargement && !donnees ? (
          <div className="flex items-center justify-center p-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
          </div>
        ) : demandesAffichees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <Inbox className="h-10 w-10 text-white/20" />
            <p className="mt-4 text-sm font-bold text-white/60">
              {demandes.length === 0
                ? "Vous n'avez encore soumis aucune demande."
                : `Aucune demande avec le statut « ${STATUTS[filtre]?.label ?? filtre} ».`}
            </p>
            {demandes.length === 0 && (
              <p className="mt-1 text-xs text-white/35">
                Vos demandes de dédouanement, de stockage et d'achat de véhicule apparaîtront ici.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {demandesAffichees.map((demande) => {
              const type = TYPES[demande.type] ?? {
                label: demande.type,
                Icone: FileText,
                couleur: 'text-white/60',
              };
              const statut = STATUTS[demande.statutGlobal] ?? {
                label: demande.statut,
                classe: 'bg-white/10 text-white/60 border-white/20',
              };
              const { Icone } = type;

              return (
                <div
                  key={`${demande.type}-${demande.id}`}
                  className="flex flex-col gap-3 p-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <Icone className={`h-4 w-4 ${type.couleur}`} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{demande.reference}</p>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                          {type.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/55">{demande.libelle || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pl-16 sm:pl-0">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
                      {formaterDate(demande.date)}
                    </span>
                    <span
                      className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${statut.classe}`}
                      title={`Statut détaillé : ${demande.statut}`}
                    >
                      {statut.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
