import React from 'react';
import { useLocation } from 'react-router-dom';

const SearchPage = () => {
  const { search } = useLocation();
  const query = new URLSearchParams(search).get('q');

  return (
    <div className="pt-40 px-10 min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">
          Résultats pour : <span className="text-saygoo-orange">"{query || "..."}"</span>
        </h1>
        
        <div className="mt-12 border-t border-gray-100 pt-10">
          <p className="text-gray-500 italic text-lg">
            Nous n'avons trouvé aucun résultat correspondant à votre recherche. 
            Vérifiez l'orthographe ou essayez d'autres mots-clés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;