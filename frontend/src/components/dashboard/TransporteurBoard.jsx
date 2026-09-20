import React from 'react';
import { QrCode, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

import { ProgressBar, SpotlightCard } from './DashboardUI';
import camion3 from '../../assets/camion3.jpeg';

const CONTENT = {
  fleet: [
    { truck: 'TRK-204', driver: 'M. Kossi', location: 'Port de Lome', status: 'En attente au port' },
    { truck: 'TRK-188', driver: 'A. Tapsoba', location: 'Cinkasse', status: 'En route' },
    { truck: 'TRK-172', driver: 'R. Mensah', location: 'Atelier', status: 'Maintenance' },
    { truck: 'TRK-165', driver: 'S. Ouedraogo', location: 'Ouaga Nord', status: 'Livraison' },
  ],
  missions: [
    { route: 'Port LOME -> Ouaga', cargo: '2 x 40 HC', action: 'Accepter' },
    { route: 'Terminal -> Kara', cargo: 'Hydrocarbures', action: 'Assigner' },
    { route: 'Port sec -> Niamey', cargo: 'Equipements', action: 'Replanifier' },
  ],
  gatePass: {
    code: 'SG-PORT-28A7',
    driver: 'TRK-204 / M. Kossi',
    validity: 'Valide jusqu a 17:30',
  },
  podFeed: [
    { ref: 'POD-8801', title: 'Bon signe receptionne', owner: 'Ouaga depot', status: 'Recu il y a 3 min' },
    { ref: 'POD-8793', title: 'Photo quai chargee', owner: 'Terminal T2', status: 'Recu il y a 11 min' },
    { ref: 'POD-8786', title: 'Signature client importee', owner: 'Bobo client final', status: 'Recu il y a 24 min' },
  ],
  loadRate: 84,
};

export default function TransporteurBoard({ focusMode }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <SpotlightCard className={`col-span-12 xl:col-span-7 ${focusMode === 'Flotte' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="relative p-6 md:p-8">
          <img src={camion3} alt="Flotte transport" className="absolute inset-0 h-full w-full object-cover opacity-14" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-[#FFBC82]">
              <Truck className="h-5 w-5" />
              <p className="text-[10px] font-black uppercase tracking-[0.32em]">Live fleet management</p>
            </div>
            <h3 className="mt-4 text-2xl font-black uppercase text-white md:text-3xl">
              Ou est la flotte et qui est immobilise
            </h3>
            <div className="mt-8 space-y-3">
              {CONTENT.fleet.map((unit) => (
                <div key={unit.truck} className="grid gap-3 rounded-[1.7rem] border border-white/8 bg-black/10 p-4 md:grid-cols-[0.65fr,0.7fr,0.9fr,0.7fr] md:items-center">
                  <div>
                    <p className="text-lg font-black uppercase text-white">{unit.truck}</p>
                    <p className="mt-1 text-sm text-white/58">{unit.driver}</p>
                  </div>
                  <p className="text-sm font-bold text-white/74">{unit.location}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: unit.status === 'Maintenance' ? '28%' : unit.status === 'En attente au port' ? '42%' : unit.status === 'Livraison' ? '88%' : '64%' }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#F36F21] to-[#FFBC82]"
                    />
                  </div>
                  <span className={`rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] ${
                    unit.status === 'Maintenance'
                      ? 'bg-[#F36F21]/14 text-[#FFBC82]'
                      : 'bg-emerald-400/12 text-emerald-200'
                  }`}>
                    {unit.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 xl:col-span-5 ${focusMode === 'Missions' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            Bourse de fret / missions
          </p>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">
            Accepter, assigner, replanifier
          </h3>
          <div className="mt-6 space-y-3">
            {CONTENT.missions.map((mission) => (
              <div key={mission.route} className="rounded-[1.6rem] border border-white/8 bg-black/10 p-4">
                <p className="text-lg font-black uppercase text-white">{mission.route}</p>
                <p className="mt-2 text-sm text-white/60">{mission.cargo}</p>
                <button
                  type="button"
                  className="mt-4 rounded-full bg-[#F36F21] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white"
                >
                  {mission.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 md:col-span-6 xl:col-span-4 ${focusMode === 'Gate Pass' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <QrCode className="h-5 w-5" />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">QR gate pass</p>
          </div>
          <div className="mt-6 rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="mx-auto grid h-40 w-40 grid-cols-6 gap-1 rounded-[1.6rem] bg-white p-4">
              {Array.from({ length: 36 }).map((_, index) => (
                <div
                  key={index}
                  className={`${[0, 1, 5, 6, 7, 12, 13, 17, 18, 20, 24, 25, 26, 30, 31, 35].includes(index) ? 'bg-black' : index % 3 === 0 ? 'bg-black/80' : 'bg-transparent'}`}
                />
              ))}
            </div>
            <p className="mt-5 text-center text-xl font-black uppercase text-white">{CONTENT.gatePass.code}</p>
            <p className="mt-2 text-center text-sm text-white/60">{CONTENT.gatePass.driver}</p>
            <p className="mt-1 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFBC82]">
              {CONTENT.gatePass.validity}
            </p>
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className={`col-span-12 md:col-span-6 xl:col-span-4 ${focusMode === 'POD' ? 'ring-1 ring-[#F36F21]/30' : ''}`}>
        <div className="p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            Proof of delivery
          </p>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">Flux POD temps reel</h3>
          <div className="mt-6 space-y-3">
            {CONTENT.podFeed.map((item) => (
              <div key={item.ref} className="rounded-[1.6rem] border border-white/8 bg-black/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">{item.ref}</p>
                <h4 className="mt-2 text-lg font-black uppercase text-white">{item.title}</h4>
                <p className="mt-2 text-sm text-white/58">{item.owner}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#FFBC82]">
                  {item.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>

      <SpotlightCard className="col-span-12 xl:col-span-4">
        <div className="p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">
            Charge & maintenance
          </p>
          <h3 className="mt-4 text-2xl font-black uppercase text-white">
            Capacite exploitable maintenant
          </h3>
          <div className="mt-6">
            <ProgressBar value={CONTENT.loadRate} label="Taux de charge flotte" detail="Barre neon de charge operationnelle" />
          </div>
          <div className="mt-6 rounded-[1.6rem] border border-white/8 bg-black/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/40">
              Signal atelier
            </p>
            <p className="mt-3 text-lg font-black uppercase text-white">4 camions passent en maintenance preventive</p>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              L equipe dispatch peut encore absorber le plan de charge grace aux unites de reserve.
            </p>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
