import React, { useState, useEffect } from 'react';
import { FaShip, FaPlane, FaTruck, FaWarehouse, FaFileInvoice } from 'react-icons/fa';

import merBateau from '../../assets/merbateau.jpeg';
import avionCamion from '../../assets/avioncamion.jpeg';
import camion3 from '../../assets/camion3.jpeg';
import techTransit from '../../assets/techtransit.jpeg';
import logisticsTech from '../../assets/logistiquetech.jpeg';

const options = [
  {
    title: "Transit Maritime",
    description: "Suivi de navires, escales & e-BAD portuaires",
    image: merBateau,
    icon: <FaShip size={22} className="text-white" />,
  },
  {
    title: "Fret Aérien",
    description: "Tracking express & dispatch terrestre",
    image: avionCamion,
    icon: <FaPlane size={22} className="text-white" />,
  },
  {
    title: "Transport Routier",
    description: "Optimisation de flottes & corridors ZLECAF",
    image: camion3,
    icon: <FaTruck size={22} className="text-white" />,
  },
  {
    title: "Entrepôt WMS/SGE",
    description: "Gestion des stocks, MAD & mouvements temps réel",
    image: techTransit,
    icon: <FaWarehouse size={22} className="text-white" />,
  },
  {
    title: "Douane & Cotations",
    description: "Cotations CDA, conformité & archivage digital",
    image: logisticsTech,
    icon: <FaFileInvoice size={22} className="text-white" />,
  },
];

const InteractiveSelector = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animatedOptions, setAnimatedOptions] = useState([]);

  useEffect(() => {
    const timers = [];
    options.forEach((_, i) => {
      const timer = setTimeout(() => {
        setAnimatedOptions((prev) => [...prev, i]);
      }, 150 * i);
      timers.push(timer);
    });
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-8 py-16 px-4">
      {/* Section Header */}
      <div className="text-center max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-[#F36F21] mb-3">
          Nos Modules
        </p>
        <h2 className="font-typo1 text-4xl md:text-5xl font-black uppercase leading-[0.94] text-white mb-4">
          Choisissez votre{' '}
          <span className="text-[#F36F21]">flux opérationnel</span>
        </h2>
        <p className="text-white/60 text-base leading-relaxed">
          Du port au dernier kilomètre — sélectionnez un mode pour découvrir ses capacités.
        </p>
      </div>

      {/* Interactive Panels */}
      <div
        className="flex w-full max-w-[1000px] h-[420px] overflow-hidden rounded-[24px] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {options.map((option, index) => {
          const isActive = activeIndex === index;
          return (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className="relative flex flex-col justify-end overflow-hidden cursor-pointer"
              style={{
                backgroundImage: `url('${option.image}')`,
                backgroundSize: isActive ? 'cover' : 'auto 120%',
                backgroundPosition: 'center',
                opacity: animatedOptions.includes(index) ? 1 : 0,
                transform: animatedOptions.includes(index) ? 'translateX(0)' : 'translateX(-60px)',
                transition: 'flex 0.7s ease-in-out, opacity 0.5s ease, transform 0.5s ease, box-shadow 0.4s ease',
                flex: isActive ? '7 1 0%' : '1 1 0%',
                borderRight: index < options.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                backgroundColor: '#0F0A06',
              }}
            >
              {/* Dark overlay */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-700"
                style={{
                  background: isActive
                    ? 'linear-gradient(to top, rgba(10,6,4,0.95) 0%, transparent 60%)'
                    : 'rgba(10,6,4,0.65)',
                }}
              />

              {/* Active accent line on top */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] transition-all duration-700"
                style={{
                  background: isActive
                    ? 'linear-gradient(to right, #F36F21, #FFBC82)'
                    : 'transparent',
                }}
              />

              {/* Label */}
              <div className="relative z-10 flex items-center gap-3 p-5 pb-6">
                <div
                  className="flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-300"
                  style={{
                    width: 42,
                    height: 42,
                    background: isActive
                      ? 'linear-gradient(135deg, #F36F21, #FFBC82)'
                      : 'rgba(30,20,12,0.85)',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {option.icon}
                </div>

                <div
                  className="transition-all duration-500"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateX(0)' : 'translateX(20px)',
                    maxWidth: isActive ? 300 : 0,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <p className="font-black text-white uppercase tracking-wide text-sm leading-tight">
                    {option.title}
                  </p>
                  <p className="text-xs text-[#FFBC82]/80 font-medium mt-0.5">{option.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2">
        {options.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className="transition-all duration-300 rounded-full"
            style={{
              width: activeIndex === i ? 24 : 8,
              height: 8,
              background: activeIndex === i ? '#F36F21' : 'rgba(255,255,255,0.2)',
            }}
            aria-label={`Select ${options[i].title}`}
          />
        ))}
      </div>
    </div>
  );
};

export default InteractiveSelector;
