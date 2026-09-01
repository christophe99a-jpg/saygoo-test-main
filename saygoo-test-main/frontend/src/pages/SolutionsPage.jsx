import React from 'react';
import { motion } from 'framer-motion';
import techTransit from '../assets/techtransit.jpeg';
import cargo from '../assets/cargo.jpeg';
import bateau from '../assets/bateau.jpeg';
import camion3 from '../assets/camion3.jpeg';

const solutions = [
  {
    id: '01',
    title: 'Tracking Multimodal',
    description: 'Suivi End-to-End en temps réel des marchandises en mer, dans les airs ou sur route via une carte centralisée.',
    image: cargo
  },
  {
    id: '02',
    title: 'Coffre-fort EDM',
    description: 'Historique immuable, centralisation de documents sécurisée. Fini les pertes de documents physiques aux douanes.',
    image: techTransit
  },
  {
    id: '03',
    title: 'Moteur Décisionnel',
    description: 'L\'IA qui ne stocke pas que de l\'info : elle alerte, prédit les temps de transit et suggère les routes optimales.',
    image: bateau
  },
  {
    id: '04',
    title: 'Mobilité & QR Code',
    description: 'Génération de laissez-passer et BAD numériques pour une vérification instantanée sans contact au port.',
    image: camion3
  }
];

const SolutionsPage = () => {
  return (
    <div className="pt-24 bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3">
      {/* Hero Section */}
      <section className="relative px-6 md:px-20 py-24 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#F36F21]/10 blur-[120px] rounded-full pointer-events-none" />
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-5xl md:text-7xl font-black text-white uppercase font-typo1"
        >
          Solutions <span className="text-[#F36F21]">Digitales</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 text-white/70 max-w-3xl mx-auto mt-6 text-lg md:text-xl"
        >
          SAYGOO n'est pas une simple base de données statique. C'est un <strong>moteur actif</strong> qui alerte, prédit et connecte les acteurs de la ZLECAF dans un environnement unifié.
        </motion.p>
      </section>

      {/* Grid de contenu */}
      <section className="relative z-10 px-6 md:px-20 pb-32 max-w-[1500px] mx-auto grid md:grid-cols-2 gap-8">
        {solutions.map((item, index) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -8 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group relative bg-[#1A110B]/80 backdrop-blur-md p-3 rounded-[40px] border border-white/10 hover:border-[#F36F21]/50 transition-colors"
          >
            <div className="relative h-[250px] md:h-[350px] w-full overflow-hidden rounded-[32px]">
              <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] via-[#0A0604]/40 to-transparent" />
              
              <div className="absolute top-6 left-6">
                <span className="inline-flex items-center justify-center bg-[#F36F21] text-white text-sm font-black w-12 h-12 rounded-xl shadow-[0_0_15px_rgba(243,111,33,0.5)]">
                  {item.id}
                </span>
              </div>
            </div>
            
            <div className="p-8">
              <h3 className="text-2xl font-black text-white mb-4 uppercase">{item.title}</h3>
              <p className="text-white/60 text-base md:text-lg leading-relaxed">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default SolutionsPage;