import React from 'react';
import { motion } from 'framer-motion';

import camion from '../assets/camion.jpeg';
import cargo2 from '../assets/cargo2.jpeg';
import logistiquetech from '../assets/logistiquetech.jpeg';
import avenirtech from '../assets/avenirtech.jpeg';

const secteurs = [
  { name: "Agro-Industrie", img: camion, desc: "Froid maîtrisé, exportations rapides et certificats sanitaires dématérialisés." },
  { name: "Énergie & Mines", img: cargo2, desc: "Transport lourd hors gabarit, sécurité des convois et suivi satellite." },
  { name: "Retail & FMCG", img: logistiquetech, desc: "WMS haute fréquence, préparation de commandes et logistique du dernier kilomètre." },
  { name: "Santé & Pharma", img: avenirtech, desc: "Traçabilité température, conformité stricte et priorisation douanière certifiée." }
];

const SecteursPage = () => {
  return (
    <div className="pt-24 bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3">
      <section className="relative px-6 md:px-20 py-20 text-center">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#F36F21]/10 blur-[150px] rounded-full pointer-events-none" />
        <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_8px_rgba(243,111,33,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
              Moteurs Métiers
            </span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-white uppercase font-typo1 mb-8 leading-tight">
            Expertise <br/> <span className="text-[#F36F21]">Sectorielle</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-lg md:text-xl relative z-10">
            Chaque industrie a ses propres défis. L'infrastructure SAYGOO s'y adapte nativement.
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 px-6 md:px-20 pb-32 max-w-[1500px] mx-auto grid xl:grid-cols-2 gap-8">
        {secteurs.map((s, idx) => (
          <motion.div 
            key={s.name}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.6, delay: idx * 0.1 }}
            className="group relative h-[300px] md:h-[450px] rounded-[40px] overflow-hidden cursor-pointer border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
          >
            <img src={s.img} alt={s.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A06] via-[#0F0A06]/70 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
            
            <div className="absolute bottom-10 left-10 right-10">
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase mb-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">{s.name}</h2>
              <p className="text-white/70 text-base md:text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 max-w-lg">
                {s.desc}
              </p>
            </div>

            <div className="absolute top-8 right-8 w-14 h-14 rounded-full border border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center -rotate-45 group-hover:rotate-0 group-hover:bg-[#F36F21] group-hover:border-[#F36F21] transition-all duration-500 shadow-xl">
              <span className="text-white text-2xl font-light">→</span>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default SecteursPage;