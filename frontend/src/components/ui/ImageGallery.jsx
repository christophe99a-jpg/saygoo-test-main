import React from "react";

import cargo from '../../assets/cargo.jpeg';
import bateau from '../../assets/bateau.jpeg';
import hdcamion from '../../assets/hdcamion.jpeg';
import avionCamion from '../../assets/avioncamion.jpeg';
import avenirTech from '../../assets/avenirtech.jpeg';

export default function ImageGallery() {
  return (
    <section className="w-full flex flex-col items-center justify-start py-12 bg-white text-gray-900 rounded-3xl">
      <div className="max-w-3xl text-center px-4">
        <h2 className="text-3xl md:text-5xl font-black uppercase text-[#2A1A10] leading-tight">
          Nos <span className="text-[#F36F21]">Infrastructures</span>
        </h2>
        <p className="text-gray-500 mt-4 text-lg">
          Une collection visuelle de nos capacités opérationnelles et de nos centres logistiques.
        </p>
      </div>

      {/* Galerie extensible */}
      <div className="flex items-center gap-2 h-[400px] w-full max-w-[1200px] mt-10 px-4">
        {[
          cargo,       // Entrepôt logistique
          bateau,      // Port et conteneurs
          hdcamion,    // Route / Camions
          avionCamion, // Fret aérien
          avenirTech,  // Grue portuaire

        ].map((src, idx) => (
          <div
            key={idx}
            className="relative group flex-grow transition-all w-32 md:w-56 rounded-[24px] overflow-hidden h-[300px] md:h-[400px] duration-500 hover:flex-grow-[4] md:hover:w-full cursor-pointer shadow-lg"
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all duration-500 z-10" />
            <img
              className="h-full w-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
              src={src}
              alt={`infrastructure-${idx}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
