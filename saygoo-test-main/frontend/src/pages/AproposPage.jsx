import React from 'react';
import { motion } from 'framer-motion';
import avenirTech from '../assets/avenirtech.jpeg';

const AproposPage = () => {
  return (
    <div className="pt-24 bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3">
      <section className="relative px-6 md:px-20 py-24 max-w-[1500px] mx-auto grid lg:grid-cols-2 gap-16 items-center">
        {/* Glow background */}
        <div className="absolute top-20 left-10 w-[600px] h-[600px] bg-[#F36F21]/15 blur-[150px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_10px_rgba(243,111,33,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
              Notre Mission
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase font-typo1 leading-[0.9] mb-8">
            Connecter chaque <span className="text-[#F36F21]">kilomètre</span> de l'Afrique.
          </h1>
          
          <p className="text-xl text-white/75 leading-relaxed mb-6">
            SAYGOO n'est pas juste un logiciel. C'est une réponse aux défis complexes de la supply chain africaine. Nous cassons les silos entre le port, la douane, et l'entrepôt.
          </p>
          <p className="text-lg text-white/50 leading-relaxed mb-10">
            Notre technologie propriétaire rend les flux logistiques transparents, sécurisés, et résilients. Conçu par des experts métier, pour les acteurs du terrain.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 rounded-[24px] bg-[#1A110B]/60 border border-white/10 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-[#F36F21]/30 transition-colors">
              <h4 className="text-[#F36F21] text-3xl font-black mb-1">+40%</h4>
              <p className="text-white/60 text-xs uppercase font-bold tracking-wider">Gain de temps douane</p>
            </div>
            <div className="p-6 rounded-[24px] bg-[#1A110B]/60 border border-white/10 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:border-[#F36F21]/30 transition-colors">
              <h4 className="text-[#F36F21] text-3xl font-black mb-1">100%</h4>
              <p className="text-white/60 text-xs uppercase font-bold tracking-wider">Visibilité temps réel</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 rounded-[40px] overflow-hidden border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] group"
        >
          <img src={avenirTech} alt="Avenir Tech Africa" className="w-full h-full object-cover min-h-[500px] transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] to-transparent/20" />
          
          <div className="absolute bottom-8 left-8 right-8">
            <div className="p-5 rounded-2xl bg-[#0F0A06]/70 backdrop-blur-md border border-white/10">
              <p className="text-[#FFBC82] text-xs font-black uppercase tracking-widest mb-2">Technologie</p>
              <p className="text-white font-typo2 font-medium text-lg">Infrastructures cloud sécurisées pour une traçabilité inviolable.</p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default AproposPage;