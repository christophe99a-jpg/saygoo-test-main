import React from 'react';

const About = () => {
  return (
    <section id="a-propos" className="py-20 px-6 md:px-20 bg-white">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
        <div className="md:w-1/2">
          <h2 className="text-saygoo-orange font-bold uppercase tracking-widest mb-4">À Propos de SGO SAS</h2>
          <h3 className="text-4xl font-black text-saygoo-brown mb-6">Digitaliser le transit à l'échelle Panafricaine.</h3>
          <p className="text-gray-600 leading-relaxed mb-6">
            SAYGOO est une plateforme numérique portée par SGO SAS, destinée à automatiser et sécuriser l’ensemble des opérations logistiques. 
            Notre mission est de réduire les délais de dédouanement et d'assurer une traçabilité complète via la technologie Blockchain.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div className="border-l-4 border-saygoo-orange pl-4">
              <h4 className="font-bold text-2xl">90%</h4>
              <p className="text-sm text-gray-500 italic">Paiements automatisés</p>
            </div>
            <div className="border-l-4 border-saygoo-brown pl-4">
              <h4 className="font-bold text-2xl">100%</h4>
              <p className="text-sm text-gray-500 italic">Conformité documentaire</p>
            </div>
          </div>
        </div>
        {/* Ici, on pourra mettre une belle image de logistique */}
        <div className="md:w-1/2 bg-gray-100 rounded-[50px] h-[400px] flex items-center justify-center shadow-inner italic text-gray-400">
           [Image d'un port ou d'un centre de données sécurisé]
        </div>
      </div>
    </section>
  );
};

export default About;