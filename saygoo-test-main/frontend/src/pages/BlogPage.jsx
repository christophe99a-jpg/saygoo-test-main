import React from 'react';
import { motion } from 'framer-motion';

import hdcamion from '../assets/hdcamion.jpeg';
import cargo2 from '../assets/cargo2.jpeg';
import bateau from '../assets/bateau.jpeg';

const articles = [
  {
    id: 1,
    category: 'Réglementation',
    date: '12 Fév 2026',
    title: "L'impact de la ZLECAF sur le transit routier en Afrique de l'Ouest.",
    excerpt: "Analyse profonde des nouvelles régulations douanières et l'impact sur la numérisation des passages frontaliers.",
    image: hdcamion
  },
  {
    id: 2,
    category: 'Technologie',
    date: '08 Mar 2026',
    title: "Comment l'IA prédictive réduit les temps d'attente au port.",
    excerpt: "Les modèles d'intelligence artificielle permettent d'anticiper les congestions portuaires avec un degré de précision chirurgical.",
    image: cargo2
  },
  {
    id: 3,
    category: 'Supply Chain',
    date: '22 Avr 2026',
    title: "Optimisation des corridors maritimes inter-africains.",
    excerpt: "Pourquoi le fret maritime de cabotage devient la nouvelle norme pour relier les hubs secondaires africains.",
    image: bateau
  }
];

const BlogPage = () => {
  return (
    <div className="pt-24 bg-[#0F0A06] overflow-x-hidden min-h-screen font-typo3">
      <section className="relative px-6 md:px-20 py-20 text-center max-w-[1200px] mx-auto">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#F36F21]/15 blur-[120px] rounded-full pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_8px_rgba(243,111,33,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
              Média & Insights
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase font-typo1 mb-6">
            Actualités du <span className="text-[#F36F21]">Réseau</span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto">
            Décryptages, tendances de la supply chain africaine et évolutions de la douane digitale.
          </p>
        </motion.div>
      </section>

      <section className="relative z-10 px-6 md:px-20 pb-32 max-w-[1500px] mx-auto grid lg:grid-cols-3 md:grid-cols-2 gap-8 lg:gap-12">
        {articles.map((article, index) => (
          <motion.article 
            key={article.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -10 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group block bg-[#1A110B]/60 backdrop-blur-sm rounded-[32px] overflow-hidden border border-white/10 hover:border-[#F36F21]/40 shadow-[0_15px_40px_rgba(0,0,0,0.3)] transition-all cursor-pointer"
          >
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={article.image} alt={article.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] via-[#0A0604]/20 to-transparent" />
              <div className="absolute top-5 left-5 bg-[#0F0A06]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                <span className="text-[#F36F21] font-black text-xs uppercase tracking-wider">{article.category}</span>
              </div>
            </div>
            
            <div className="p-8">
              <p className="text-white/40 text-sm font-bold uppercase tracking-wider mb-4">{article.date}</p>
              <h2 className="text-xl md:text-2xl font-black text-white mb-4 group-hover:text-[#F36F21] transition-colors leading-tight">
                {article.title}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                {article.excerpt}
              </p>
              
              <div className="inline-flex items-center gap-2 text-[#F36F21] font-black text-[10px] uppercase tracking-[0.2em]">
                Lire l'article
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </motion.article>
        ))}
      </section>
    </div>
  );
};

export default BlogPage;