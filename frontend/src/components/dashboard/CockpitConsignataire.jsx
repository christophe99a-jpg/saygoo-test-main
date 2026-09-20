import React, { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Ship, Package, FileCheck, CalendarClock, AlertTriangle, Inbox,
  Plus, X, CheckCircle2, XCircle, ArrowLeft, Anchor,
} from 'lucide-react';
import { ConsignataireAPI } from '../../lib/apiF';

const STATUTS_NAVIRE = {
  ANNOUNCED: { label: 'Annoncé', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  ARRIVED: { label: 'À quai', classe: 'bg-[#3C9AB7]/15 text-[#3C9AB7] border-[#3C9AB7]/30' },
  DEPARTED: { label: 'Parti', classe: 'bg-white/10 text-white/50 border-white/20' },
};

const STATUTS_BAD = {
  PENDING: { label: 'En attente', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  VALIDATED: { label: 'Actif', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  REJECTED: { label: 'Rejeté', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
  CANCELLED: { label: 'Annulé', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const STATUTS_BOOKING = {
  PENDING: { label: 'En attente', classe: 'bg-[#F3921F]/15 text-[#F3921F] border-[#F3921F]/30' },
  VALIDATED: { label: 'Validé', classe: 'bg-[#4CC38A]/15 text-[#4CC38A] border-[#4CC38A]/30' },
  REFUSED: { label: 'Refusé', classe: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const formatNombre = (v) => (v == null ? '—' : Number(v).toLocaleString('fr-FR'));

const formatDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const messageErreur = (err, defaut) =>
  err.status === 503 ? 'Le service Consignataire est momentanément indisponible.' : err.message || defaut;

const champ =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F36F21]';
const libelle = 'mb-2 block text-[10px] font-black uppercase tracking-widest text-white/45';

function Badge({ statut, table }) {
  const s = table[statut] ?? { label: statut, classe: 'bg-white/10 text-white/60 border-white/20' };
  return (
    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${s.classe}`}>
      {s.label}
    </span>
  );
}

function Compteur({ label, valeur, Icone, couleur }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/45">
        <Icone className={`h-4 w-4 ${couleur}`} /> {label}
      </div>
      <p className="mt-3 text-2xl font-black text-white">{valeur}</p>
    </div>
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

// ── Annonce d'un navire ─────────────────────────────────────────────────────────
function FormulaireNavire({ onAnnuler, onSucces }) {
  const [data, setData] = useState({
    vessel_name: '',
    atp: '',
    handler: '',
    berth: '',
    eta: '',
    etd: '',
    containers_announced: '',
    manifest_customs_ok: false,
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const maj = (cle, valeur) => setData((p) => ({ ...p, [cle]: valeur }));

  const valider = async () => {
    if (!data.vessel_name.trim()) {
      setErreur('Le nom du navire est obligatoire.');
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      await ConsignataireAPI.creerNavire({
        vessel_name: data.vessel_name.trim(),
        atp: data.atp.trim() || undefined,
        handler: data.handler.trim() || undefined,
        berth: data.berth.trim() || undefined,
        eta: data.eta || undefined,
        etd: data.etd || undefined,
        containers_announced: data.containers_announced ? Number(data.containers_announced) : 0,
        manifest_customs_ok: data.manifest_customs_ok,
        manifest_timestamp: data.manifest_customs_ok ? new Date().toISOString() : undefined,
      });
      onSucces();
    } catch (err) {
      setErreur(messageErreur(err, "Le navire n'a pas pu être annoncé."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <div className="mb-5 flex items-start justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">Annoncer un navire</h3>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={libelle} htmlFor="nav">Nom du navire *</label>
          <input id="nav" className={champ} value={data.vessel_name} onChange={(e) => maj('vessel_name', e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="atp">ATP</label>
          <input id="atp" className={champ} value={data.atp} onChange={(e) => maj('atp', e.target.value)} placeholder="Autorisation de traitement" />
        </div>
        <div>
          <label className={libelle} htmlFor="handler">Manutentionnaire</label>
          <input id="handler" className={champ} value={data.handler} onChange={(e) => maj('handler', e.target.value)} placeholder="Togo Terminal" />
        </div>
        <div>
          <label className={libelle} htmlFor="berth">Poste à quai</label>
          <input id="berth" className={champ} value={data.berth} onChange={(e) => maj('berth', e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="cont">Conteneurs annoncés</label>
          <input id="cont" type="number" min="0" className={champ} value={data.containers_announced} onChange={(e) => maj('containers_announced', e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="eta">ETA</label>
          <input id="eta" type="datetime-local" className={champ} value={data.eta} onChange={(e) => maj('eta', e.target.value)} />
        </div>
        <div>
          <label className={libelle} htmlFor="etd">ETD</label>
          <input id="etd" type="datetime-local" className={champ} value={data.etd} onChange={(e) => maj('etd', e.target.value)} />
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <input
          type="checkbox"
          checked={data.manifest_customs_ok}
          onChange={(e) => maj('manifest_customs_ok', e.target.checked)}
          className="h-4 w-4 accent-[#F36F21]"
        />
        <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
          Manifeste validé par la Douane
        </span>
      </label>

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
        {envoi ? 'Enregistrement…' : 'Annoncer le navire'}
      </button>
    </div>
  );
}

// ── Émission d'un e-BAD ─────────────────────────────────────────────────────────
function FormulaireBad({ bls, onAnnuler, onSucces }) {
  const [blId, setBlId] = useState('');
  const [data, setData] = useState({
    importer: '',
    container_number: '',
    consignee: '',
    validity_date: '',
    deadline_date: '',
    consignee_reference: '',
    observations: '',
  });
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  const maj = (cle, valeur) => setData((p) => ({ ...p, [cle]: valeur }));

  const valider = async () => {
    if (!blId) {
      setErreur('Sélectionnez un connaissement.');
      return;
    }

    setEnvoi(true);
    setErreur(null);
    try {
      await ConsignataireAPI.emettreBad(blId, {
        ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== '')),
        issued_by: 'CONSIGNATAIRE',
      });
      onSucces();
    } catch (err) {
      setErreur(messageErreur(err, "Le BAD n'a pas pu être émis."));
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#F36F21]/30 bg-black/30 p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Émettre un e-BAD</h3>
          <p className="mt-1 text-[11px] text-white/45">
            Le numéro unique est attribué automatiquement par SAYGOO.
          </p>
        </div>
        <button type="button" onClick={onAnnuler} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {bls.length === 0 ? (
        <p className="rounded-xl border border-[#F3921F]/30 bg-[#F3921F]/10 px-4 py-3 text-xs font-bold text-[#F3921F]">
          Aucun connaissement enregistré. Créez d&apos;abord un BL pour pouvoir émettre un BAD.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={libelle} htmlFor="bl">Connaissement (BL) *</label>
              <select id="bl" className={champ} value={blId} onChange={(e) => setBlId(e.target.value)}>
                <option value="" className="bg-[#1B1B1B]">Choisir…</option>
                {bls.map((bl) => (
                  <option key={bl.id} value={bl.id} className="bg-[#1B1B1B]">
                    {bl.bl_number} — {bl.client_name || 'client non précisé'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={libelle} htmlFor="imp">Importateur</label>
              <input id="imp" className={champ} value={data.importer} onChange={(e) => maj('importer', e.target.value)} />
            </div>
            <div>
              <label className={libelle} htmlFor="cont-num">Conteneur</label>
              <input id="cont-num" className={champ} value={data.container_number} onChange={(e) => maj('container_number', e.target.value)} />
            </div>
            <div>
              <label className={libelle} htmlFor="dest">Destinataire</label>
              <input id="dest" className={champ} value={data.consignee} onChange={(e) => maj('consignee', e.target.value)} />
            </div>
            <div>
              <label className={libelle} htmlFor="ref">Référence consignataire</label>
              <input id="ref" className={champ} value={data.consignee_reference} onChange={(e) => maj('consignee_reference', e.target.value)} />
            </div>
            <div>
              <label className={libelle} htmlFor="val">Date de validité</label>
              <input id="val" type="date" className={champ} value={data.validity_date} onChange={(e) => maj('validity_date', e.target.value)} />
            </div>
            <div>
              <label className={libelle} htmlFor="lim">Date limite</label>
              <input id="lim" type="date" className={champ} value={data.deadline_date} onChange={(e) => maj('deadline_date', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={libelle} htmlFor="obs">Observations</label>
              <textarea id="obs" rows={2} className={champ} value={data.observations} onChange={(e) => maj('observations', e.target.value)} />
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
            {envoi ? 'Émission…' : "Émettre le BAD"}
          </button>
        </>
      )}
    </div>
  );
}

// ── Écran principal ─────────────────────────────────────────────────────────────
export default function CockpitConsignataire() {
  const [onglet, setOnglet] = useState('arrivages');
  const [stats, setStats] = useState(null);
  const [navires, setNavires] = useState([]);
  const [bads, setBads] = useState([]);
  const [bls, setBls] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [formulaire, setFormulaire] = useState(null);
  const [action, setAction] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState({});

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);

    // Chaque bloc est indépendant : l'échec d'un module ne vide pas tout l'écran.
    const [resStats, resNavires, resBads, resBls, resBookings] = await Promise.allSettled([
      ConsignataireAPI.statsDechargement(),
      ConsignataireAPI.navires(),
      ConsignataireAPI.listerBad(),
      ConsignataireAPI.listerBl(),
      ConsignataireAPI.listerBookings(),
    ]);

    if (resStats.status === 'fulfilled') {
      setStats(resStats.value.data ?? resStats.value);
    } else {
      setStats(null);
      setErreur(messageErreur(resStats.reason, 'Impossible de charger les compteurs.'));
    }

    setNavires(resNavires.status === 'fulfilled' ? resNavires.value.data ?? resNavires.value ?? [] : []);
    setBads(resBads.status === 'fulfilled' ? resBads.value.data ?? resBads.value ?? [] : []);
    setBls(resBls.status === 'fulfilled' ? resBls.value.data ?? resBls.value ?? [] : []);
    setBookings(resBookings.status === 'fulfilled' ? resBookings.value.data ?? resBookings.value ?? [] : []);
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

  if (formulaire === 'navire') {
    return (
      <FormulaireNavire
        onAnnuler={() => setFormulaire(null)}
        onSucces={() => {
          setFormulaire(null);
          setOnglet('arrivages');
          charger();
        }}
      />
    );
  }

  if (formulaire === 'bad') {
    return (
      <FormulaireBad
        bls={bls}
        onAnnuler={() => setFormulaire(null)}
        onSucces={() => {
          setFormulaire(null);
          setOnglet('bad');
          charger();
        }}
      />
    );
  }

  const bookingsEnAttente = bookings.filter((b) => b.status === 'PENDING').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Entête */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-[0.08em] text-white">Cockpit consignataire</h2>
          <p className="mt-1 text-sm text-white/50">Arrivages, déchargement, e-BAD et booking export.</p>
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

      {/* Compteurs DECHARGEMENT */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Compteur label="Conteneurs annoncés" valeur={formatNombre(stats?.containersAnnounced)} Icone={Package} couleur="text-[#3C9AB7]" />
        <Compteur label="Conteneurs traités" valeur={formatNombre(stats?.containersProcessed)} Icone={Package} couleur="text-[#4CC38A]" />
        <Compteur label="Connaissements" valeur={formatNombre(stats?.blCount)} Icone={FileCheck} couleur="text-[#F3921F]" />
        <Compteur label="e-BAD validés" valeur={formatNombre(stats?.badValidatedCount)} Icone={CheckCircle2} couleur="text-[#4CC38A]" />
      </div>

      {/* Actions rapides */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setFormulaire('navire')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#F36F21] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[#d95f18]"
        >
          <Plus className="h-4 w-4" /> Annoncer un navire
        </button>
        <button
          type="button"
          onClick={() => setFormulaire('bad')}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/80 hover:border-white/30 hover:text-white"
        >
          <FileCheck className="h-4 w-4" /> Émettre un e-BAD
        </button>
      </div>

      {/* Onglets */}
      <div className="flex flex-wrap gap-2">
        {[
          { cle: 'arrivages', label: `Arrivages (${navires.length})` },
          { cle: 'bad', label: `e-BAD (${bads.length})` },
          { cle: 'booking', label: `Booking export (${bookingsEnAttente} à traiter)` },
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
      ) : onglet === 'arrivages' ? (
        navires.length === 0 ? (
          <Vide texte="Aucun navire annoncé." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {navires.map((n) => (
              <div key={n.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <Ship className="h-4 w-4 text-[#3C9AB7]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{n.vessel_name}</p>
                    <p className="mt-0.5 text-xs text-white/55">
                      {n.handler || 'manutentionnaire non précisé'}
                      {n.berth ? ` · Poste ${n.berth}` : ''}
                      {n.atp ? ` · ATP ${n.atp}` : ''}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                      ETA {formatDate(n.eta)} · ETD {formatDate(n.etd)} ·{' '}
                      {formatNombre(n.containers_announced)} conteneurs
                      {n.manifest_customs_ok ? ' · Manifeste OK Douane' : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pl-16 lg:pl-0">
                  <Badge statut={n.status} table={STATUTS_NAVIRE} />

                  {n.status === 'ANNOUNCED' && (
                    <button
                      type="button"
                      onClick={() => executer(`a-${n.id}`, () => ConsignataireAPI.statutNavire(n.id, 'ARRIVED'))}
                      disabled={Boolean(action)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-40"
                    >
                      <Anchor className="h-3.5 w-3.5" /> {action === `a-${n.id}` ? '…' : 'À quai'}
                    </button>
                  )}
                  {n.status === 'ARRIVED' && (
                    <button
                      type="button"
                      onClick={() => executer(`d-${n.id}`, () => ConsignataireAPI.statutNavire(n.id, 'DEPARTED'))}
                      disabled={Boolean(action)}
                      className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white disabled:opacity-40"
                    >
                      {action === `d-${n.id}` ? '…' : 'Départ'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : onglet === 'bad' ? (
        bads.length === 0 ? (
          <Vide texte="Aucun BAD émis." />
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
            {bads.map((b) => (
              <div key={b.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <FileCheck className="h-4 w-4 text-[#F36F21]" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{b.bad_number || 'Sans numéro'}</p>
                      <p className="mt-0.5 text-xs text-white/55">
                        {b.bl?.bl_number ? `BL ${b.bl.bl_number}` : ''}
                        {b.consignee ? ` · ${b.consignee}` : ''}
                        {b.container_number ? ` · ${b.container_number}` : ''}
                      </p>
                      {b.cancel_reason && (
                        <p className="mt-0.5 text-[10px] font-bold uppercase text-red-400">
                          Annulé : {b.cancel_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge statut={b.status} table={STATUTS_BAD} />
                </div>

                {b.status === 'VALIDATED' && (
                  <div className="flex gap-3 pl-16">
                    <input
                      className={champ}
                      placeholder="Motif d'annulation"
                      value={motifAnnulation[b.id] || ''}
                      onChange={(e) => setMotifAnnulation((p) => ({ ...p, [b.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        executer(`c-${b.id}`, () =>
                          ConsignataireAPI.annulerBad(b.id, {
                            reason: motifAnnulation[b.id],
                            changed_by: 'CONSIGNATAIRE',
                          }),
                        )
                      }
                      disabled={!motifAnnulation[b.id]?.trim() || Boolean(action)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/40 px-4 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-30"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Annuler
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <Vide texte="Aucune demande de booking export." />
      ) : (
        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md">
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <CalendarClock className="h-4 w-4 text-[#C77DFF]" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{b.booking_reference}</p>
                  <p className="mt-0.5 text-xs text-white/55">
                    {b.company_name || b.client_reference || '—'}
                    {b.port_of_destination ? ` → ${b.port_of_destination}` : ''}
                    {b.cargo_nature ? ` · ${b.cargo_nature}` : ''}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                    {b.container_quantity ? `${b.container_quantity} × ` : ''}
                    {b.container_type?.replace('_', ' ') || ''}
                    {b.dangerous_goods ? ' · Marchandise dangereuse' : ''}
                  </p>
                  {b.refusal_reason && (
                    <p className="mt-0.5 text-[10px] font-bold uppercase text-red-400">
                      Refus : {b.refusal_reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pl-16 lg:pl-0">
                <Badge statut={b.status} table={STATUTS_BOOKING} />

                {b.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => executer(`v-${b.id}`, () => ConsignataireAPI.validerBooking(b.id))}
                      disabled={Boolean(action)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#4CC38A]/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#4CC38A] hover:bg-[#4CC38A]/10 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        executer(`r-${b.id}`, () =>
                          ConsignataireAPI.refuserBooking(b.id, 'Capacité insuffisante sur ce départ'),
                        )
                      }
                      disabled={Boolean(action)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Refuser
                    </button>
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