import React from 'react';
import { AlertTriangle, Calculator } from 'lucide-react';

import { MetricTile, ProgressBar, SpotlightCard } from './DashboardUI';
import cargo from '../../assets/cargo.jpeg';

const CONTENT = {
  pipeline: [
    { title: 'En preparation', count: 12 },
    { title: 'Soumis Sydonia', count: 9 },
    { title: 'En inspection', count: 7 },
    { title: 'Liquide', count: 14 },
  ],
  alerts: [
    '3 dossiers necessitent une mise a jour tarifaire avant visa.',
    'Inspection physique programmee pour le BL MSC-2205 a 14h30.',
    'Une autorisation exceptionnelle expire dans moins de 4 heures.',
  ],
  estimator: {
    hsCode: '8704.23',
    cif: '14.800.000 XOF',
    customs: '20%',
    vat: '18%',
    zlecaf: 'Reduction 6%',
    total: '5.624.000 XOF',
  },
  treasury: {
    paidToday: '11.800.000 XOF',
    outstanding: '4.200.000 XOF',
    progress: 73,
  },
  priorities: [
    { ref: 'CDA-7781', title: 'Visa enlevement a confirmer', owner: 'Desk conformite', status: 'En revue' },
    { ref: 'CDA-7733', title: 'Correction code HS dossier import', owner: 'Supervision Lome', status: 'Urgent' },
    { ref: 'CDA-7698', title: 'Mainlevee accordee pour convoi multi-colis', owner: 'Coordination', status: 'Cloture' },
  ],
};

export default function CdaBoard({ focusMode }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <SpotlightCard className={`col-span-12 xl:col-span-8 ${focusMode === 'Pipeline' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="relative p-6 md:p-8">
          <img src={cargo} alt="Flux douanier" className="absolute inset-0 h-full w-full object-cover opacity-12" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
              Pipeline douanier
            </p>
            <h3 className="mt-3 text-2xl font-black uppercase text-white md:text-3xl">
              Mini-kanban de dedouanement
            </h3>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {CONTENT.pipeline.map((step, index) => (
                <div key={step.title} className="relative rounded-[1.8rem] border border-white/8 bg-black/10 p-5">
                  <div className="mb-8 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white/48">
                      Etape {index + 1}
                    </span>
                    <span className="text-2xl font-black text-[#FFBC82]">{step.count}</span>
                  </div>
                  <h4 className="text-lg font-black uppercase text-white">{step.title}</h4>
                  {index < CONTENT.pipeline.length - 1 ? (
                    <span className="absolute right-[-0.8rem] top-1/2 hidden h-[2px] w-6 -translate-y-1/2 bg-[#F36F21]/40 md:block" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-4 ${focusMode === 'Alertes' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">Alertes bloquantes</p>
          </div>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">Voir dabord ce qui bloque</h3>

          <div className="mt-6 space-y-3">
            {CONTENT.alerts.map((alert, index) => (
              <div key={alert} className="rounded-[1.5rem] border border-[#F36F21]/20 bg-[#F36F21]/8 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFBC82]">
                  Alerte 0{index + 1}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/72">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-5 ${focusMode === 'Taxation' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <Calculator className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">Calculateur express</p>
          </div>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">Simulation droits & taxes</h3>
          <div className="mt-6 grid gap-3">
            <EstimatorLine label="HS Code" value={CONTENT.estimator.hsCode} />
            <EstimatorLine label="Base CIF" value={CONTENT.estimator.cif} />
            <EstimatorLine label="Droit de douane" value={CONTENT.estimator.customs} />
            <EstimatorLine label="TVA" value={CONTENT.estimator.vat} />
            <EstimatorLine label="ZLECAF" value={CONTENT.estimator.zlecaf} />
            <div className="rounded-[1.5rem] border border-[#F36F21]/24 bg-[#F36F21]/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#FFBC82]">
                Total simule
              </p>
              <p className="mt-3 text-3xl font-black text-white">{CONTENT.estimator.total}</p>
            </div>
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-7 ${focusMode === 'Tresor' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6 md:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            KPI financier
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase text-white">Droits payes vs reste a payer</h3>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr,1.2fr]">
            <div className="grid gap-4">
              <MetricTile label="Paye aujourd hui" value={CONTENT.treasury.paidToday} detail="Versements faits au tresor" />
              <MetricTile label="Reste a regler" value={CONTENT.treasury.outstanding} detail="Dossiers en cours de liquidation" accent="text-[#F36F21]" />
            </div>
            <div className="rounded-[1.8rem] border border-white/8 bg-black/10 p-5">
              <ProgressBar value={CONTENT.treasury.progress} label="Avancement tresor" detail="Barre neon de progression des paiements" />
              <div className="mt-6 space-y-3">
                {CONTENT.priorities.map((item) => (
                  <PriorityRow key={item.ref} item={item} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}

function EstimatorLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.3rem] border border-white/8 bg-black/10 px-4 py-3">
      <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/44">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function PriorityRow({ item }) {
  return (
    <div className="flex flex-col gap-4 rounded-[1.6rem] border border-white/8 bg-black/10 p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{item.ref}</p>
        <h4 className="mt-2 text-lg font-black uppercase text-white">{item.title}</h4>
        <p className="mt-2 text-sm text-white/58">{item.owner}</p>
      </div>
      <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] ${
        item.status === 'Urgent'
          ? 'bg-[#F36F21]/14 text-[#FFBC82]'
          : item.status === 'Cloture'
            ? 'bg-emerald-400/12 text-emerald-200'
            : 'bg-white/8 text-white/66'
      }`}>
        {item.status}
      </span>
    </div>
  );
}
