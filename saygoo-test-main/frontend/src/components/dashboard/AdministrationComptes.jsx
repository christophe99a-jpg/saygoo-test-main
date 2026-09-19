import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Search, UserCheck, AlertTriangle, Inbox, ShieldCheck,
  CheckCircle2, Ban, Power, History, X,
} from 'lucide-react';
import { UtilisateursAPI } from '../../lib/apiF';
import { useAuth } from '../../auth/AuthContextF';

const STATUTS = {
  EN_ATTENTE_VALIDATION: { label: 'À valider', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  ACTIF: { label: 'Actif', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  SUSPENDU: { label: 'Suspendu', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
  DESACTIVE: { label: 'Désactivé', classe: 'bg-white/10 text-white/40 border-white/20' },
};

// Rôles de l'enum Role du back-end
const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CDA',
  'CONSIGNATAIRE',
  'OPERATEUR_ECONOMIQUE',
  'GESTIONNAIRE_ENTREPOT',
  'TRANSPORTEUR',
  'COMPTABLE',
  'MANAGER',
];

const FILTRES = [
  { cle: '', label: 'Tous' },
  { cle: 'EN_ATTENTE_VALIDATION', label: 'À valider' },
  { cle: 'ACTIF', label: 'Actifs' },
  { cle: 'SUSPENDU', label: 'Suspendus' },
  { cle: 'DESACTIVE', label: 'Désactivés' },
];

const formatDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const messageErreur = (err, defaut) =>
  err.status === 503 ? "Le service d'authentification est momentanément indisponible." : err.message || defaut;

function Badge({ statut }) {
  const s = STATUTS[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

export default function AdministrationComptes() {
  const { session } = useAuth();

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [journal, setJournal] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState('EN_ATTENTE_VALIDATION');
  const [action, setAction] = useState(null);
  const [afficherJournal, setAfficherJournal] = useState(false);

  const estAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(session?.roleBackend);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const reponse = await UtilisateursAPI.lister({
        search: recherche || undefined,
        statut: filtre || undefined,
        limit: 50,
      });
      setUtilisateurs(reponse.data?.utilisateurs ?? []);
    } catch (err) {
      setErreur(
        err.status === 403
          ? "Votre compte n'a pas les droits d'administration."
          : messageErreur(err, 'Impossible de charger les comptes.'),
      );
      setUtilisateurs([]);
    } finally {
      setChargement(false);
    }
  }, [recherche, filtre]);

  useEffect(() => {
    if (estAdmin) charger();
    else setChargement(false);
  }, [estAdmin, filtre, charger]);

  const chargerJournal = async () => {
    try {
      const reponse = await UtilisateursAPI.journal({ limit: 30 });
      setJournal(reponse.data?.entrees ?? []);
      setAfficherJournal(true);
    } catch (err) {
      setErreur(messageErreur(err, "Impossible de charger le journal."));
    }
  };

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

  // ─── Accès refusé ───────────────────────────────────────────────────
  if (!estAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center backdrop-blur-md">
        <ShieldCheck className="h-10 w-10 text-white/20" />
        <p className="mt-4 text-sm font-bold text-white/60">Espace réservé aux administrateurs</p>
        <p className="mt-1 text-xs text-white/35">
          Votre rôle actuel ({session?.roleBackend || 'inconnu'}) ne permet pas de gérer les comptes.
        </p>
      </div>
    );
  }

  const aValider = utilisateurs.filter((u) => u.statut === 'EN_ATTENTE_VALIDATION').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Entête */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Administration des comptes</h2>
            <p className="mt-1 text-sm text-white/50">
              Validez les inscriptions et gérez les rôles et statuts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={chargerJournal}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white"
            >
              <History className="h-4 w-4" /> Journal
            </button>
            <button
              type="button"
              onClick={charger}
              disabled={chargement}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-[#F36F21]/40 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${chargement ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && charger()}
            placeholder="Email, nom, entreprise…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none focus:border-[#F36F21]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTRES.map((f) => (
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

      {aValider > 0 && filtre !== 'EN_ATTENTE_VALIDATION' && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F3921F]/30 bg-[#F3921F]/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F3921F]" />
          <p className="text-xs font-bold text-[#F3921F]">
            {aValider} compte(s) en attente de validation dans cette liste.
          </p>
        </div>
      )}

      {erreur && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-xs font-bold text-red-300">{erreur}</p>
        </div>
      )}

      {/* Journal d'audit */}
      {afficherJournal && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Journal d&apos;audit</h3>
            <button type="button" onClick={() => setAfficherJournal(false)} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {journal.length === 0 ? (
            <p className="text-xs text-white/40">Aucune entrée.</p>
          ) : (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {journal.map((e) => (
                <div key={e.id} className="border-l border-white/10 pl-4">
                  <p className="text-xs font-bold text-white/80">
                    {e.action}
                    {!e.succes && <span className="ml-2 text-red-400">échec</span>}
                  </p>
                  <p className="text-[10px] text-white/35">
                    {e.email || '—'} · {e.createdAt ? new Date(e.createdAt).toLocaleString('fr-FR') : ''}
                    {e.detail ? ` — ${e.detail}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Liste des comptes */}
      {chargement ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[#F36F21]" />
        </div>
      ) : utilisateurs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-16 text-center">
          <Inbox className="h-10 w-10 text-white/20" />
          <p className="mt-4 text-sm font-bold text-white/60">
            {filtre === 'EN_ATTENTE_VALIDATION'
              ? 'Aucun compte en attente de validation.'
              : 'Aucun compte ne correspond à ces critères.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {utilisateurs.map((u) => {
            const soiMeme = u.id === session?.utilisateur?.id;

            return (
              <div key={u.id} className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <UserCheck className="h-4 w-4 text-[#3C9AB7]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">
                        {u.prenom} {u.nom}
                        {soiMeme && (
                          <span className="ml-2 text-[10px] font-bold uppercase text-white/35">(vous)</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-white/55">{u.email}</p>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                        {u.raisonSociale || 'sans entreprise'} · inscrit le {formatDate(u.createdAt)}
                        {u.emailVerifie ? ' · email vérifié' : ' · email non vérifié'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-16 lg:pl-0">
                    <span className="rounded-md border border-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                      {u.role}
                    </span>
                    <Badge statut={u.statut} />
                  </div>
                </div>

                {/* Actions — indisponibles sur son propre compte */}
                {soiMeme ? (
                  <p className="pl-16 text-[10px] font-bold uppercase tracking-widest text-white/25">
                    Vous ne pouvez pas modifier votre propre compte
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pl-16">
                    {u.statut === 'EN_ATTENTE_VALIDATION' && (
                      <button
                        type="button"
                        onClick={() => executer(`v-${u.id}`, () => UtilisateursAPI.changerStatut(u.id, 'ACTIF'))}
                        disabled={Boolean(action)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#F36F21] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18] disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {action === `v-${u.id}` ? '…' : 'Valider le compte'}
                      </button>
                    )}

                    {u.statut === 'ACTIF' && (
                      <button
                        type="button"
                        onClick={() => executer(`s-${u.id}`, () => UtilisateursAPI.changerStatut(u.id, 'SUSPENDU'))}
                        disabled={Boolean(action)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#F3921F]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#F3921F] hover:bg-[#F3921F]/10 disabled:opacity-40"
                      >
                        <Ban className="h-3.5 w-3.5" /> Suspendre
                      </button>
                    )}

                    {['SUSPENDU', 'DESACTIVE'].includes(u.statut) && (
                      <button
                        type="button"
                        onClick={() => executer(`r-${u.id}`, () => UtilisateursAPI.changerStatut(u.id, 'ACTIF'))}
                        disabled={Boolean(action)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#4CC38A]/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#4CC38A] hover:bg-[#4CC38A]/10 disabled:opacity-40"
                      >
                        <Power className="h-3.5 w-3.5" /> Réactiver
                      </button>
                    )}

                    {u.statut !== 'DESACTIVE' && (
                      <button
                        type="button"
                        onClick={() => executer(`d-${u.id}`, () => UtilisateursAPI.changerStatut(u.id, 'DESACTIVE'))}
                        disabled={Boolean(action)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" /> Désactiver
                      </button>
                    )}

                    <select
                      value={u.role}
                      onChange={(e) => executer(`ro-${u.id}`, () => UtilisateursAPI.changerRole(u.id, e.target.value))}
                      disabled={Boolean(action)}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 outline-none focus:border-[#F36F21] disabled:opacity-40"
                      title="Changer le rôle déconnecte l'utilisateur"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r} className="bg-[#1B1B1B]">{r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-white/25">
        Suspendre, désactiver ou changer le rôle d&apos;un utilisateur met fin à ses sessions en cours.
      </p>
    </div>
  );
}