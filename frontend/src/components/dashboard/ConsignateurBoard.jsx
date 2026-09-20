import React from 'react';
import { ClipboardCheck, Container, Ship } from 'lucide-react';

import { MetricTile, ProgressRing, SpotlightCard } from './DashboardUI';
import merBateau from '../../assets/merbateau.jpeg';

const CONTENT = {
  vessels: [
    { name: 'MSC ALINA', eta: '12:40', etd: '19:15', state: 'Retard 1h20' },
    { name: 'MAERSK KAYA', eta: '15:10', etd: '22:30', state: 'A quai' },
    { name: 'CMA FONTAINE', eta: '18:00', etd: '04:00', state: 'En approche' },
    { name: 'GRIMALDI WEST', eta: '23:40', etd: '08:20', state: 'Fenetre reservee' },
  ],
  manifestProgress: 85,
  manifestItems: [
    'Manifeste navire MSC ALINA - 214 conteneurs traites',
    '3 BL restent a ventiler sur le poste import',
    'Derniere correction recue il y a 18 minutes',
  ],
  containerStats: [
    { label: 'A quai', value: '118' },
    { label: 'Surestaries', value: '14' },
    { label: 'Prets a sortir', value: '36' },
  ],
  releases: [
    { ref: 'BAD-2026-091', client: 'Sogeco Import', state: 'Signature prete' },
    { ref: 'BAD-2026-096', client: 'Industrie Sahel', state: 'Douane en attente' },
    { ref: 'BAD-2026-099', client: 'Agro Export', state: 'Relache possible' },
  ],
  activity: [
    { ref: 'CSG-2201', title: 'ETA navire feeder mise a jour', owner: 'Ops marine', status: 'En cours' },
    { ref: 'CSG-2194', title: 'Correction manifeste import cacao', owner: 'Desk escale', status: 'A valider' },
    { ref: 'CSG-2177', title: 'Quai reserve pour rotation du soir', owner: 'Coordination port', status: 'Confirme' },
  ],
};

export default function ConsignateurBoard({ focusMode }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <SpotlightCard className={`col-span-12 xl:col-span-7 ${focusMode === 'Escales' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="relative p-6 md:p-8">
          <img src={merBateau} alt="Escale navire" className="absolute inset-0 h-full w-full object-cover opacity-15" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#FFBC82]">
              <Ship className="h-5 w-5" />
              <p className="text-[10px] font-black uppercase tracking-[0.32em]">Controle des escales</p>
            </div>
            <h3 className="mt-4 text-2xl font-black uppercase text-white md:text-3xl">
              ETA / ETD sous les yeux, sans ouvrir dix ecrans
            </h3>

            <div className="mt-8 space-y-4">
              {CONTENT.vessels.map((vessel) => (
                <div key={vessel.name} className="grid gap-3 rounded-[1.7rem] border border-white/8 bg-black/10 p-4 md:grid-cols-[1.1fr,0.45fr,0.45fr,0.7fr] md:items-center">
                  <div>
                    <p className="text-lg font-black uppercase text-white">{vessel.name}</p>
                    <p className="mt-1 text-sm text-white/58">Rotation sous supervision port / consignation</p>
                  </div>
                  <span className="rounded-full bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/66">
                    ETA {vessel.eta}
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/66">
                    ETD {vessel.etd}
                  </span>
                  <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] ${
                    vessel.state.includes('Retard')
                      ? 'bg-[#F36F21]/14 text-[#FFBC82]'
                      : 'bg-emerald-400/12 text-emerald-200'
                  }`}>
                    {vessel.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-5 ${focusMode === 'Manifestes' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            Traitement des manifestes
          </p>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">
            Eclatement dans le systeme
          </h3>
          <div className="mt-6">
            <ProgressRing
              value={CONTENT.manifestProgress}
              label="Manifestation en cours"
              detail="Progression en anneau sur le manifeste principal du jour."
            />
          </div>
          <div className="mt-6 space-y-3">
            {CONTENT.manifestItems.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/8 bg-black/10 p-4 text-sm leading-relaxed text-white/72">
                {item}
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-6 ${focusMode === 'Conteneurs' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <Container className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">Inventaire conteneurs</p>
          </div>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">
            Ce qui dort au quai et ce qui coute
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {CONTENT.containerStats.map((item) => (
              <MetricTile key={item.label} label={item.label} value={item.value} detail="Mise a jour temps reel" />
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-6 ${focusMode === 'BAD' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <ClipboardCheck className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">Generateur BAD</p>
          </div>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">
            Relacher un conteneur sans friction
          </h3>
          <div className="mt-6 space-y-3">
            {CONTENT.releases.map((release) => (
              <div key={release.ref} className="flex flex-col gap-3 rounded-[1.6rem] border border-white/8 bg-black/10 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">{release.ref}</p>
                  <h4 className="mt-2 text-lg font-black uppercase text-white">{release.client}</h4>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/8 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
                    {release.state}
                  </span>
                  <button
                    type="button"
                    className="rounded-full bg-[#F36F21] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white"
                  >
                    Signer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className="col-span-12">
        <div className="p-6 md:p-8">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            Activite du jour
          </p>
          <h3 className="mt-3 text-2xl font-black uppercase text-white md:text-3xl">
            Rotation, corrections et coordination terminal
          </h3>
          <div className="mt-6 space-y-3">
            {CONTENT.activity.map((item) => (
              <PriorityRow key={item.ref} item={item} />
            ))}
          </div>
        </div>
      </SpotlightCard>
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
        item.status === 'Confirme' ? 'bg-emerald-400/12 text-emerald-200' : 'bg-white/8 text-white/66'
      }`}>
        {item.status}
      </span>
    </div>
  );
}
