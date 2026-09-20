import React from 'react';

const HelpPage = () => {
  const faqs = [
    { q: "Comment suivre ma marchandise ?", r: "Utilisez votre code de tracking dans l'espace client pour voir la position GPS en temps réel." },
    { q: "Quels sont les délais de dédouanement ?", r: "Grâce à notre interconnexion API Douane, nous réduisons les délais de 30% par rapport au transit classique." },
    { q: "Le paiement STAMKCASH est-il sécurisé ?", r: "Oui, tous les flux financiers sont cryptés et validés par notre partenaire bancaire." }
  ];

  return (
    <div className="pt-32 pb-20 px-6 md:px-20 min-h-screen bg-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-black text-saygoo-brown mb-4 uppercase">Centre d'aide</h1>
        <p className="text-gray-500 mb-12">Tout ce que vous devez savoir sur la logistique digitale SAYGOO.</p>
        
        <div className="space-y-6">
          {faqs.map((item, i) => (
            <div key={i} className="border border-gray-100 p-6 rounded-2xl hover:border-saygoo-orange transition-colors shadow-sm">
              <h3 className="font-bold text-lg text-saygoo-brown mb-2">Q: {item.q}</h3>
              <p className="text-gray-600 italic">{item.r}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;