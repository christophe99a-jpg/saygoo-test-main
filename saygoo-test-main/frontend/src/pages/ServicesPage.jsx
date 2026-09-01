import React from 'react';
import { motion } from 'framer-motion';
import techTransit from '../assets/techtransit.jpeg';
import cargo from '../assets/cargo.jpeg';
import avioncamion from '../assets/avioncamion.jpeg';
import hdcamion from '../assets/hdcamion.jpeg';
import bateau from '../assets/bateau.jpeg';
import avenirtech from '../assets/avenirtech.jpeg';

const services = [
  {
    title: 'Transit & Douane Digitalisés',
    desc: 'Déclarations conformes, délais réduits et opérations sécurisées par blockchain douanière.',
    img: bateau
  },
  {
    title: 'Transports Multimodaux',
    desc: 'Routier, maritime, ferroviaire : pilotage centralisé pour un fret sans couture.',
    img: avioncamion
  },
  {
    title: 'SGE / WMS (Stock)',
    desc: 'Stocks, emplacements, mouvements et alertes anti-rupture en temps réel.',
    img: techTransit
  },
  {
    title: 'Archivage Numérisé',
    desc: 'Étiquetage, QR Codes et gestion documentaire certifiée ZLECAF.',
    img: avenirtech
  },
  {
    title: 'Suivi Intelligent (IA)',
    desc: 'Traçabilité prédictive, tableaux de bord interactifs et KPIs automatisés.',
    img: cargo
  },
  {
    title: 'Flottes Terrestres',
    desc: 'Géolocalisation des camions, gestion carburant et optimisation des tournées.',
    img: hdcamion
  },
];

const ServicesPage = () => {
  return (
    <div className="pt-24 bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3">
      <section className="relative px-6 md:px-20 py-24 text-center">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#F36F21]/15 blur-[120px] rounded-full pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_8px_rgba(243,111,33,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
              Nos Expertises
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase font-typo1 mb-8">
            Services <span className="text-[#F36F21]">Opérationnels</span>
          </h1>
          <p className="text-white/70 max-w-2xl mx-auto text-lg md:text-xl">
            Des services digitaux et terrains fusionnés pour piloter, sécuriser et accélérer vos corridors logistiques.
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 px-6 md:px-20 pb-32 max-w-[1500px] mx-auto grid lg:grid-cols-3 md:grid-cols-2 gap-8">
        {services.map((service, index) => (
          <motion.div 
            key={service.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -10 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative bg-[#1A110B]/60 backdrop-blur-md rounded-[32px] overflow-hidden border border-white/10 hover:border-[#F36F21]/40 shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-colors p-3"
          >
            <div className="relative aspect-video rounded-3xl overflow-hidden mb-6 border border-white/5">
              <img src={service.img} alt={service.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] via-[#0A0604]/20 to-transparent" />
            </div>
            <div className="px-5 pb-5">
              <h3 className="text-xl font-black text-white mb-3 uppercase tracking-wider">{service.title}</h3>
              <p className="text-white/60 leading-relaxed text-sm">
                {service.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default ServicesPage;
