import React from 'react';
import { motion } from 'framer-motion';
import { VerticalImageStack } from '../components/ui/VerticalImageStack';

import hdcamion from '../assets/hdcamion.jpeg';
import avioncamion from '../assets/avioncamion.jpeg';
import merbateau from '../assets/merbateau.jpeg';

const transportModes = [
  {
    id: "01",
    title: "Fret Terrestre & Flotte",
    subtitle: "Réseau Routier ZLECAF",
    desc: "Optimisation des tournées, géolocalisation GPS en temps réel, et gestion intelligente des consommations de carburant. Une tour de contrôle pour votre flotte logistique.",
    img: hdcamion,
    accent: "from-[#F36F21]/20 to-transparent",
  },
  {
    id: "02",
    title: "Corridor Maritime",
    subtitle: "Opérations Portuaires",
    desc: "Suivi des navires, gestion des escales, et anticipation des surestaries. Synchronisez vos opérations avant même que le navire n'accoste au port.",
    img: merbateau,
    accent: "from-[#10243A]/50 to-transparent",
  },
  {
    id: "03",
    title: "Transit Aérien",
    subtitle: "Fret Express",
    desc: "Vos envois prioritaires suivis de près. Tableaux de bord dynamiques pour coordonner avec précision les atterrissages et le dispatch terrestre.",
    img: avioncamion,
    accent: "from-[#FFBC82]/20 to-transparent",
  }
];

const TransportPage = () => {
  return (
    <div className="bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3 text-white pt-24 pb-20">
      
      {/* HEADER SECTION */}
      <section className="relative px-6 md:px-20 py-24">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[800px] h-[300px] bg-[#F36F21]/10 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-[1500px] mx-auto relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_8px_rgba(243,111,33,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
                Logistique Active
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase font-typo1 leading-tight mb-6">
              Transport <br/> <span className="text-[#F36F21]">Multimodal</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl leading-relaxed max-w-xl">
              Air, mer et route synchronisés dans un même flux opérationnel. Prenez le contrôle de vos mouvements physiques grâce à notre infrastructure de tracking prédictive.
            </p>
          </motion.div>

          {/* KPI Cards Floating */}
          <div className="grid grid-cols-2 gap-4">
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="bg-[#1A110B]/60 border border-white/10 backdrop-blur-md p-6 rounded-[32px]"
             >
                <h3 className="text-4xl font-black text-white mb-2">24/7</h3>
                <p className="text-[#F36F21] text-[10px] uppercase font-black tracking-widest">Tracking Temps Réel</p>
             </motion.div>
             <motion.div 
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.6, delay: 0.3 }}
               className="bg-[radial-gradient(ellipse_at_top,#2A1A10,#0F0A06)] border border-[#F36F21]/30 p-6 rounded-[32px] mt-8"
             >
                <h3 className="text-4xl font-black text-white mb-2">+95%</h3>
                <p className="text-[#FFBC82] text-[10px] uppercase font-black tracking-widest">SLA Respecté</p>
             </motion.div>
          </div>
        </div>
      </section>

      {/* CORE TRANSPORT CARDS */}
      <section className="relative z-10 max-w-[1500px] mx-auto px-6 md:px-20 py-10 space-y-12">
         {transportModes.map((mode, idx) => (
           <motion.div 
             key={mode.id}
             initial={{ opacity: 0, y: 40 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true, amount: 0.2 }}
             transition={{ duration: 0.6, delay: idx * 0.1 }}
             className={`flex flex-col lg:flex-row gap-8 lg:gap-16 items-center ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
           >
             
             {/* Text Content */}
             <div className="flex-1 space-y-6">
                <span className="text-[#F36F21] font-black tracking-[0.3em] uppercase text-sm">
                   {mode.id}. {mode.subtitle}
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-tight">
                   {mode.title}
                </h2>
                <div className="w-16 h-1 bg-white/10 rounded-full" />
                <p className="text-white/60 text-lg leading-relaxed max-w-lg">
                   {mode.desc}
                </p>
             </div>

             {/* Visual Image */}
             <div className="flex-1 w-full">
                <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden group border border-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                  <img src={mode.img} alt={mode.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
                  <div className={`absolute inset-0 bg-gradient-to-tr ${mode.accent} opacity-60`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Connecté au réseau SAYGOO</span>
                    </div>
                  </div>
                </div>
             </div>

           </motion.div>
         ))}
      </section>

      {/* INTERACTIVE GALLERY */}
      <section className="relative z-10 max-w-[1500px] mx-auto px-6 md:px-20 py-10 space-y-12 mb-20">
        <div className="text-center mb-0">
           <h2 className="text-3xl md:text-5xl font-black text-white uppercase leading-tight">
             Galerie <span className="text-[#F36F21]">Opérations</span>
           </h2>
           <p className="text-white/60 text-lg leading-relaxed mt-4">
             Visualisez le cœur de notre activité de transit multimodal.
           </p>
        </div>
        <div className="w-full flex justify-center overflow-hidden">
           <VerticalImageStack />
        </div>
      </section>

    </div>
  );
};

export default TransportPage;