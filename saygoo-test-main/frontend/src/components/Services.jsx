import React from 'react';

const services = [
  { title: "Transit & Dédouanement", desc: "Automatisation des calculs fiscaux et interconnexion API Douane.", icon: "📦" },
  { title: "Transport & Logistique", desc: "Suivi temps réel par GPS et livraisons vertes (KPI ≥60%).", icon: "🚛" },
  { title: "Gestion Documentaire", desc: "OCR intelligent et archivage numérique horodaté sur Blockchain.", icon: "📄" },
  { title: "Paiements Sécurisés", desc: "Paiements multi-canaux et Split payment automatique via STAMKCASH.", icon: "💳" }
];

const Services = () => {
  return (
    <section id="services" className="py-20 px-6 md:px-20 bg-gray-50">
      <div className="text-center mb-16">
        <h2 className="text-saygoo-brown font-black text-4xl uppercase">Nos Solutions Digitales</h2>
        <div className="h-1 w-20 bg-saygoo-orange mx-auto mt-4"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {services.map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl shadow-xl hover:-translate-y-2 transition-all border-b-4 border-transparent hover:border-saygoo-orange group cursor-pointer">
            <div className="text-4xl mb-6">{s.icon}</div>
            <h4 className="font-bold text-xl mb-4 text-saygoo-brown group-hover:text-saygoo-orange transition-colors">{s.title}</h4>
            <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Services;