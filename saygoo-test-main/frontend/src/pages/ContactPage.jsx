import React from 'react';
import { motion } from 'framer-motion';

const ContactPage = () => {
  const contactInfo = [
    {
      title: "Adresse du Bureau",
      lines: ["380 St Kilda Road, Melbourne", "VIC 3004, Australia"],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    {
      title: "Heures de Travail",
      lines: ["Lundi au Vendredi 09:00 à 18:30", "Samedi 15:30"],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Nous Écrire",
      lines: ["support@saygoo.africa", "info@saygoo.africa"],
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="pt-32 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-20 pb-24">
        
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          
          {/* 📍 GAUCHE : INFOS DE CONTACT */}
          <div className="w-full lg:w-1/3 space-y-12">
            {contactInfo.map((info, idx) => (
              <div key={idx} className="flex items-start gap-6 border-b border-gray-100 pb-8 last:border-0">
                <div className="w-16 h-16 bg-[#F36F21] rounded-full flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#F36F21]/20">
                  {info.icon}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#2A1A10] uppercase mb-2 tracking-tight">
                    {info.title}
                  </h3>
                  {info.lines.map((line, lIdx) => (
                    <p key={lIdx} className="text-gray-500 font-medium">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ✉️ DROITE : FORMULAIRE "GET IN TOUCH" */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-2/3 bg-gray-50 p-8 md:p-16 rounded-[40px]"
          >
            <h2 className="text-4xl md:text-5xl font-black text-[#2A1A10] text-center mb-12 uppercase font-typo1">
              Prendre <span className="text-[#F36F21]">Contact</span>
            </h2>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input 
                type="text" 
                placeholder="Votre Nom" 
                className="w-full bg-white border border-gray-200 p-4 rounded-lg outline-none focus:border-[#F36F21] transition-colors"
              />
              <input 
                type="email" 
                placeholder="Votre Email" 
                className="w-full bg-white border border-gray-200 p-4 rounded-lg outline-none focus:border-[#F36F21] transition-colors"
              />
              <input 
                type="text" 
                placeholder="Téléphone" 
                className="w-full bg-white border border-gray-200 p-4 rounded-lg outline-none focus:border-[#F36F21] transition-colors"
              />
              <input 
                type="text" 
                placeholder="Sujet" 
                className="w-full bg-white border border-gray-200 p-4 rounded-lg outline-none focus:border-[#F36F21] transition-colors"
              />
              <textarea 
                placeholder="Votre message..." 
                rows="5" 
                className="w-full md:col-span-2 bg-white border border-gray-200 p-4 rounded-lg outline-none focus:border-[#F36F21] transition-colors resize-none"
              ></textarea>
              
              <button 
                type="submit"
                className="md:col-span-2 bg-[#F36F21] text-white font-black py-5 rounded-xl uppercase tracking-[0.2em] text-sm hover:bg-[#2A1A10] transition-all transform hover:scale-[1.02] shadow-xl shadow-[#F36F21]/20"
              >
                Envoyer le message maintenant
              </button>
            </form>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default ContactPage;