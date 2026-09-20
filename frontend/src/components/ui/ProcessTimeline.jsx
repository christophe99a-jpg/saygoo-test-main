import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { 
  UserCheck, 
  ClipboardList, 
  ShieldCheck, 
  Calculator, 
  CheckCircle2, 
  FileSignature, 
  CreditCard, 
  Zap, 
  Eye, 
  Truck 
} from 'lucide-react';

const steps = [
  {
    title: "Inscription et validation",
    desc: "Tous les utilisateurs créent un compte et passent un KYC pour garantir la fiabilité.",
    icon: UserCheck
  },
  {
    title: "Demande de service",
    desc: "L'importateur soumet une demande pour le dédouanement de ses marchandises.",
    icon: ClipboardList
  },
  {
    title: "Vérification",
    desc: "Le système analyse les données fournies pour vérifier la conformité.",
    icon: ShieldCheck
  },
  {
    title: "Analyse et cotation",
    desc: "La demande est envoyée aux CDA pour proposer des devis compétitifs.",
    icon: Calculator
  },
  {
    title: "Choix de l'offre",
    desc: "L'Opérateur Economique sélectionne l'offre la plus optimale.",
    icon: CheckCircle2
  },
  {
    title: "Procédures douanières",
    desc: "Le dossier est sécurisé et le CDA démarre les procédures (BAD / e-BAD).",
    icon: FileSignature
  },
  {
    title: "Paiement digital",
    desc: "Le client effectue son paiement en ligne via des solutions sécurisées.",
    icon: CreditCard
  },
  {
    title: "Dédouanement",
    desc: "Après confirmation du paiement, le dédouanement est effectué.",
    icon: Zap
  },
  {
    title: "Suivi en temps réel",
    desc: "Notifications d'avancement et génération automatique des factures.",
    icon: Eye
  },
  {
    title: "Livraison finale",
    desc: "La marchandise est livrée via la procédure e-Livraison.",
    icon: Truck
  }
];

export default function ProcessTimeline() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div ref={containerRef} className="relative py-24 px-6 md:px-12 xl:px-20 max-w-[1400px] mx-auto overflow-hidden">
      <div className="flex flex-col items-center mb-20 text-center">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-xs font-black uppercase tracking-[0.4em] text-[#F36F21] mb-6"
        >
          Operating Flow
        </motion.p>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black uppercase text-white leading-tight"
        >
          Comment <span className="text-transparent" style={{ WebkitTextStroke: '1px white' }}>SAYGOO</span> fonctionne
        </motion.h2>
      </div>

      <div className="relative mt-20">
        {/* Progress Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/5 -translate-x-1/2 hidden md:block" />
        <motion.div 
          className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#F36F21] to-[#FFBC82] origin-top -translate-x-1/2 hidden md:block"
          style={{ scaleY }}
        />

        <div className="space-y-16 md:space-y-32">
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;
            return (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.8, delay: index * 0.05 }}
                className={`relative flex flex-col md:flex-row items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
              >
                {/* Dot */}
                <div className="absolute left-1/2 top-0 md:top-1/2 -translate-x-1/2 -translate-y-12 md:-translate-y-1/2 z-20 hidden md:block">
                  <motion.div 
                    whileHover={{ scale: 1.5 }}
                    className="w-4 h-4 rounded-full bg-[#150D08] border-2 border-[#F36F21] shadow-[0_0_15px_rgba(243,111,33,0.5)]" 
                  />
                </div>

                {/* Content */}
                <div className={`w-full md:w-1/2 ${isEven ? 'md:pl-20' : 'md:pr-20'} text-center md:text-left`}>
                  <div className={`flex flex-col ${isEven ? 'md:items-start' : 'md:items-end'} items-center`}>
                    <div className="p-4 rounded-2xl bg-[#1A110B] border border-white/5 mb-6 group hover:border-[#F36F21]/30 transition-colors">
                      <step.icon className="w-8 h-8 text-[#F36F21]" />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F36F21]/80 mb-2">
                       Étape {index + 1}
                    </p>
                    <h3 className="text-xl md:text-2xl font-black uppercase text-white mb-4">
                      {step.title}
                    </h3>
                    <p className={`text-sm md:text-base text-white/60 leading-relaxed max-w-sm ${isEven ? 'md:text-left' : 'md:text-right'} text-center`}>
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Vertical spacer for mobile */}
                <div className="h-20 md:hidden" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
