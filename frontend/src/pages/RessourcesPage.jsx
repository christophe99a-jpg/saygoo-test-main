import React from 'react';
import { motion } from 'framer-motion';

const RessourcesPage = () => {
  const ressources = [
    {
      title: "Guide Export ZLECAF 2026",
      category: "Documentation",
      type: "PDF",
      desc: "Tout ce qu'il faut savoir sur les nouvelles normes de transit interfrontalier."
    },
    {
      title: "Optimisation WMS",
      category: "Livre Blanc",
      type: "EBOOK",
      desc: "Comment réduire vos coûts de stockage de 20% grâce à la digitalisation."
    },
    {
      title: "API Documentation",
      category: "Technique",
      type: "DOCS",
      desc: "Manuel d'intégration pour connecter votre ERP à la plateforme SAYGOO."
    },
    {
      title: "Étude de cas : Agro-Industrie",
      category: "Success Story",
      type: "CAS",
      desc: "Découvrez comment nous avons fluidifié l'export de cacao au Ghana."
    }
  ];

  return (
    <div className="pt-24 bg-[#2A1A10] min-h-screen">
      {/* SECTION TITRE */}
      <section className="px-6 md:px-20 py-16 border-b border-white/10">
        <div className="max-w-4xl">
          <span className="text-[#F36F21] font-black tracking-widest text-xs uppercase mb-4 block">
            Centre de connaissances
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase font-typo1 leading-none">
            Ressources & <br /> <span className="text-transparent" style={{ WebkitTextStroke: '1.5px white' }}>Expertise</span>
          </h1>
          <p className="text-white/60 mt-8 text-lg max-w-2xl leading-relaxed">
            Accédez à nos guides exclusifs, documentations techniques et analyses du marché logistique africain.
          </p>
        </div>
      </section>

      {/* FILTRES RAPIDES (Visuel) */}
      <section className="px-6 md:px-20 py-8 flex flex-wrap gap-4">
        {['Tous', 'Guides', 'Études de cas', 'Technique'].map((filter, idx) => (
          <button 
            key={idx} 
            className={`px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
              ${idx === 0 ? 'bg-[#F36F21] border-[#F36F21] text-white' : 'border-white/20 text-white hover:border-[#F36F21]'}`}
          >
            {filter}
          </button>
        ))}
      </section>

      {/* GRILLE DES RESSOURCES */}
      <section className="px-6 md:px-20 pb-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ressources.map((res, index) => (
          <motion.div 
            key={index}
            whileHover={{ y: -10 }}
            className="bg-[#1A110B] p-8 rounded-3xl border border-white/5 flex flex-col justify-between h-[350px] group transition-all hover:bg-[#F36F21]/5"
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <span className="bg-[#F36F21] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase">
                  {res.type}
                </span>
                <div className="text-white/20 group-hover:text-[#F36F21] transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="浸4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </div>
              <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter block mb-2">
                {res.category}
              </span>
              <h3 className="text-white text-xl font-bold uppercase leading-tight mb-4">
                {res.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {res.desc}
              </p>
            </div>

            <button className="mt-6 text-white text-[10px] font-black uppercase tracking-widest border-b border-[#F36F21] pb-1 w-fit group-hover:text-[#F36F21] transition-colors">
              Télécharger
            </button>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

export default RessourcesPage;