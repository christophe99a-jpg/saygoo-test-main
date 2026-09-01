import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

import bgWave from '../assets/saygo-wave.jpg';
import heroFreight from '../assets/hdcamion.jpeg';
import techTransit from '../assets/techtransit.jpeg';
import logisticsTech from '../assets/logistiquetech.jpeg';
import avionCamion from '../assets/avioncamion.jpeg';
import cargo from '../assets/cargo.jpeg';
import cargo2 from '../assets/cargo2.jpeg';
import merBateau from '../assets/merbateau.jpeg';
import bateau from '../assets/bateau.jpeg';
import camion3 from '../assets/camion3.jpeg';
import avenirTech from '../assets/avenirtech.jpeg';

import ImageGallery from '../components/ui/ImageGallery';
import InteractiveSelector from '../components/ui/InteractiveSelector';
import ProcessTimeline from '../components/ui/ProcessTimeline';

const HERO_MESSAGES = [
  'orchestre le transit sans angle mort.',
  'relie la douane, le port et le terrain.',
  'rend vos flux plus lisibles et plus rapides.',
];

const solutionCards = [
  {
    id: '01',
    title: 'Transit & Douane',
    description:
      'Preparation documentaire, orchestration des declarations et suivi des jalons de conformite du premier port au dernier poste frontiere.',
    image: cargo,
    accent: 'from-[#F36F21] to-[#FFB36C]',
  },
  {
    id: '02',
    title: 'WMS / SGE',
    description:
      "Pilotage des stocks, mouvements d'entrepot, controles qualite et visibilite temps reel pour les equipes terrain comme pour la direction.",
    image: techTransit,
    accent: 'from-[#2A1A10] to-[#6A4021]',
  },
  {
    id: '03',
    title: 'Transport Multimodal',
    description:
      'Air, mer et route synchronises dans un meme flux operationnel avec des plans de charge plus lisibles et des decisions plus rapides.',
    image: avionCamion,
    accent: 'from-[#10243A] to-[#3C9AB7]',
  },
  {
    id: '04',
    title: 'Archivage & Tracabilite',
    description:
      'Documents, pieces jointes, QR et historique dactions centralises dans un cockpit clair pense pour les operations africaines.',
    image: camion3,
    accent: 'from-[#13231A] to-[#4CC38A]',
  },
];

const spotlightStats = [
  { value: '24/7', label: 'Visibilité Tracker Multimodal' },
  { value: 'IA', label: 'Prévision Douanière' },
  { value: 'ZLECAF', label: 'Connectivité Panafricaine' },
];

const operatingPillars = [
  {
    title: 'Command Center',
    description: 'Une lecture immédiate des statuts douaniers, exceptions et mouvements portuaires.',
  },
  {
    title: 'Intelligence Algorithmique',
    description: 'Prédiction des retards logistiques et routage optimal des frets avec l\'IA.',
  },
  {
    title: 'Ecosystème Connecté',
    description: 'Workflows collaboratifs entre transitaires, douaniers et transporteurs.',
  },
];

export default function HomePage({ onConnectClick }) {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef(null);
  const [typedText, setTypedText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const floatX = useSpring(pointerX, { stiffness: 120, damping: 18, mass: 0.6 });
  const floatY = useSpring(pointerY, { stiffness: 120, damping: 18, mass: 0.6 });
  const orbitX = useTransform(floatX, (value) => value * -0.45);
  const orbitY = useTransform(floatY, (value) => value * -0.45);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroBackgroundY = useTransform(heroProgress, [0, 1], [0, 140]);
  const waveY = useTransform(heroProgress, [0, 1], [0, 90]);
  const heroCopyY = useTransform(heroProgress, [0, 1], [0, -36]);
  const heroVisualY = useTransform(heroProgress, [0, 1], [0, -68]);
  const heroGlowScale = useTransform(heroProgress, [0, 1], [1, 1.16]);
  const heroFade = useTransform(heroProgress, [0, 0.82], [1, 0.62]);

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }

    const currentMessage = HERO_MESSAGES[phraseIndex];
    const isPhraseComplete = typedText === currentMessage;
    const isPhraseEmpty = typedText.length === 0;
    const timeoutDelay = !isDeleting && isPhraseComplete ? 1600 : isDeleting ? 30 : 54;

    const timeoutId = window.setTimeout(() => {
      if (isDeleting && isPhraseEmpty) {
        setIsDeleting(false);
        setPhraseIndex((current) => (current + 1) % HERO_MESSAGES.length);
        return;
      }

      if (!isDeleting && isPhraseComplete) {
        setIsDeleting(true);
        return;
      }

      if (isDeleting) {
        setTypedText(currentMessage.slice(0, typedText.length - 1));
        return;
      }

      setTypedText(currentMessage.slice(0, typedText.length + 1));
    }, timeoutDelay);

    return () => window.clearTimeout(timeoutId);
  }, [typedText, phraseIndex, isDeleting, reduceMotion]);

  const handleHeroPointerMove = (event) => {
    if (reduceMotion) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const nextX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 30;
    const nextY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 22;
    pointerX.set(nextX);
    pointerY.set(nextY);
  };

  const resetHeroPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <main className="relative w-full overflow-x-hidden bg-[#0F0A06] font-typo3 pt-24">
      <section
        ref={heroRef}
        className="relative min-h-[100svh] overflow-hidden px-6 py-8 md:px-12 md:py-12 xl:px-20"
      >
        <motion.div className="absolute inset-0" style={{ y: heroBackgroundY }}>
          <img
            src={bgWave}
            alt="Hero Logistique Saygoo Wave"
            className="absolute inset-0 h-full w-full object-cover object-center scale-[1.05]"
          />
          <div className="absolute inset-0 bg-[#0F0A06]/50 mix-blend-multiply" />
          <motion.div
            className="absolute -right-24 top-8 h-[30rem] w-[30rem] rounded-full bg-[#F36F21]/30 blur-[120px]"
            style={{ scale: heroGlowScale }}
          />
          <motion.div
            className="absolute -left-16 bottom-8 h-[22rem] w-[22rem] rounded-full bg-[#F36F21]/20 blur-[100px]"
            style={{ x: orbitX, y: orbitY }}
          />
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A06]/80 via-[#0F0A06]/30 to-transparent" />

        <div className="relative z-10 mx-auto grid max-w-[1500px] items-center gap-12 xl:grid-cols-[0.92fr,1.08fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            style={{ y: heroCopyY, opacity: heroFade }}
            className="pt-8 text-white md:pt-12"
          >
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#1A110B]/80 px-4 py-2 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#F36F21] shadow-[0_0_8px_rgba(243,111,33,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.34em] text-white/80">
                Logistics Operating Interface
              </span>
            </div>

            <h1 className="mb-6 max-w-5xl font-typo1 text-5xl font-black uppercase leading-[0.88] text-white sm:text-6xl lg:text-8xl">
              SAYGOO
              <span className="block text-white/20">Pilote</span>
              <span
                className="block text-transparent"
                style={{ WebkitTextStroke: '1.8px white' }}
              >
                les flux africains
              </span>
            </h1>

            <div className="mb-6">
              <p className="text-xl md:text-3xl font-typo2 font-semibold text-[#FFBC82] mb-4">
                La plateforme qui orchestre le transit sans angle mort.
              </p>
            </div>

            <p className="mb-10 max-w-2xl text-base leading-relaxed text-white/80 md:text-xl">
              Le standard digital pour le transit en Afrique de l’Ouest. Connectez tous les acteurs — commissionnaires, transporteurs, consignataires et entrepôts — dans un écosystème unique pour importer et dédouaner en toute sécurité.
            </p>

            <div className="flex flex-wrap gap-4 mt-8">
              <FloatingButton onClick={onConnectClick} primary>
                Accéder à la plateforme
              </FloatingButton>
              <FloatingButton onClick={onConnectClick}>
                Demander une démo
              </FloatingButton>
            </div>

            <div className="flex items-center gap-6 mt-16 p-4 bg-[#1A110B]/60 border-l border-white/10 max-w-fit">
              <div className="w-16 h-16 bg-[#0F0A06] flex items-center justify-center p-2 border border-white/5">
                <img src={bgWave} alt="Wave Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="text-white font-black text-xl md:text-2xl tracking-tight">SAYGOO WAVE™</p>
                <p className="text-[#F36F21] font-bold text-xs uppercase tracking-widest mt-1">Technologie de Tracking</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            style={{ y: heroVisualY }}
            onMouseMove={handleHeroPointerMove}
            onMouseLeave={resetHeroPointer}
            className="relative min-h-[36rem] lg:min-h-[44rem]"
          >
            <motion.div
              className="absolute inset-0 rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-sm"
              style={{ x: floatX, y: floatY }}
            />
            <motion.div
              className="absolute -inset-6 rounded-[52px] bg-[radial-gradient(circle_at_top,rgba(243,111,33,0.2),transparent_48%)] blur-2xl"
              style={{ x: orbitX, y: orbitY }}
            />

            <div className="absolute inset-0 overflow-hidden rounded-[40px] border border-white/10 shadow-[0_35px_80px_rgba(0,0,0,0.5)] bg-[#0F0A06]/80 backdrop-blur-md group cursor-pointer">
              <motion.img 
                src={logisticsTech} 
                alt="Saygoo Operating Interface" 
                style={{ y: useTransform(heroProgress, [0, 1], ['0%', '15%']), scale: 1.15 }}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-125 origin-top" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0604] via-transparent to-transparent opacity-80" />


              {/* Overlay central glow */}
              <motion.div
                style={{ x: floatX, y: floatY }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full h-32 w-32 bg-[#F36F21]/30 blur-2xl pointer-events-none"
              />


              <div className="absolute inset-x-5 bottom-5 grid gap-4 lg:grid-cols-[1.02fr,0.98fr]">
                <motion.div
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="rounded-[30px] border border-white/15 bg-[#120D08]/58 p-6 backdrop-blur-xl"
                >
                  <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#FFBC82]">
                    Tour de Contrôle
                  </p>
                  <h3 className="mb-3 text-2xl font-black uppercase leading-tight text-white md:text-3xl">
                    Une supervision multimodale en temps reél
                  </h3>
                  <p className="max-w-lg text-sm leading-relaxed text-white/70 md:text-base">
                    Centralisez vos opérations douanières, portuaires et terrestres dans un cockpit unique pensé pour faciliter la prise de décision rapide.
                  </p>
                </motion.div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MiniHeroCard
                    image={merBateau}
                    title="Corridor maritime"
                    subtitle="Approches, escales et synchronisation documentaire"
                  />
                  <MiniHeroCard
                    image={avenirTech}
                    title="Digital ops"
                    subtitle="Une couche visuelle plus nette pour les equipes terrain"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 mt-10 hidden items-center justify-center gap-4 lg:flex"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.32em] text-white/42">
            Faites defiler
          </span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-10 w-[1px] bg-gradient-to-b from-white/0 via-white/70 to-white/0"
          />
        </motion.div>
      </section>

      <section className="relative z-10 px-6 py-10 md:px-12 xl:px-20">
        <div className="mx-auto grid max-w-[1500px] gap-4 md:grid-cols-3">
          {operatingPillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -10, scale: 1.01 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="rounded-[28px] border border-white/8 bg-[#1A120D] p-6 md:p-7"
            >
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#F36F21]/80">
                0{index + 1}
              </p>
              <h3 className="mb-3 text-2xl font-black uppercase text-white">{pillar.title}</h3>
              <p className="mb-5 leading-relaxed text-white/65">{pillar.description}</p>
              <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ x: '-100%' }}
                  whileInView={{ x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.75, delay: 0.2 + index * 0.08 }}
                  className="h-full w-full rounded-full bg-gradient-to-r from-[#F36F21] to-[#FFBC82]"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-6 py-10 md:px-12 xl:px-20 bg-[#120D08]">
        <InteractiveSelector />
      </section>

      <section className="relative z-10 px-6 py-10 md:px-12 xl:px-20 overflow-hidden">
        <ImageGallery />
      </section>

      <section className="relative z-10 bg-[#0A0604]">
        <ProcessTimeline />
      </section>

      <section className="relative z-10 px-6 py-16 md:px-12 md:py-20 xl:px-20">
        <div className="mx-auto max-w-[1500px]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="mb-10 max-w-3xl md:mb-12"
          >
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-[#F36F21]">
              Solutions digitales cles
            </p>
            <h2 className="mb-4 font-typo1 text-4xl font-black uppercase leading-[0.94] text-white md:text-6xl">
              L'infrastructure digitale de votre logistique
            </h2>
            <p className="text-base leading-relaxed text-white/70 md:text-lg">
              De la déclaration douanière à l'entrepôt, chaque module est conçu pour fluidifier vos flux, réduire les délais d'attente et sécuriser votre conformité.
            </p>
          </motion.div>

          <div className="grid gap-5 lg:grid-cols-2">
            {solutionCards.map((card, index) => (
              <SolutionCard key={card.id} card={card} index={index} onConnectClick={onConnectClick} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-16 md:px-12 md:py-20 xl:px-20">
        <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[1fr,1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5 }}
            className="rounded-[34px] border border-white/10 bg-[#18100B] p-7 md:p-10"
          >
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-[#F36F21]">
              Ce qu’il faut retenir
            </p>
            <h2 className="mb-6 font-typo1 text-4xl font-black uppercase leading-[0.95] text-white md:text-5xl">
              L'excellence logistique sans compromis
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#F36F21]" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#FFBC82]">Gagner du temps</h4>
                  <p className="text-sm text-white/60">Automatisation des flux et procédures administratives.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#F36F21]" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#FFBC82]">Réduire les coûts</h4>
                  <p className="text-sm text-white/60">Optimisation des cotations et suppression des frais inutiles.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#F36F21]" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#FFBC82]">Sécuriser les transactions</h4>
                  <p className="text-sm text-white/60">Paiements digitaux et processus KYC rigoureux.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#F36F21]" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#FFBC82]">Visibilité Complète</h4>
                  <p className="text-sm text-white/60">Suivi en temps réel sur toute la chaîne logistique.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-5 md:grid-cols-[0.72fr,1fr]">
            <VisualCard
              image={bateau}
              title="Corridor portuaire"
              subtitle="Approche marine, manutention et visibilite de bout en bout"
            />
            <VisualCard
              image={cargo2}
              title="Supply chain narrative"
              subtitle="Plus de matiere, plus de confiance et plus de lecture produit"
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function FloatingButton({ children, onClick, primary = false }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`px-8 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 md:px-10 flex items-center gap-2 ${
        primary
          ? 'bg-[#F36F21] text-white hover:bg-white hover:text-[#0F0A06]'
          : 'border border-white/20 bg-transparent text-white hover:bg-white hover:text-[#0F0A06]'
      }`}
    >
      {children}
    </motion.button>
  );
}

function MetricPill({ label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/6 px-3 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.28em] text-white/48">{label}</span>
      <span className={`text-sm font-black ${accent ? 'text-[#FFBC82]' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function MiniHeroCard({ image, title, subtitle }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yResult = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -8, scale: 1.02 }}
      className="relative min-h-[11rem] overflow-hidden rounded-[28px] border border-white/15 bg-[#120D08]/50 group"
    >
      <motion.img 
        src={image} 
        alt={title} 
        style={{ y: yResult, scale: 1.25 }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-150" 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#120D08] via-[#120D08]/28 to-transparent" />
      <div className="relative z-10 flex h-full flex-col justify-end p-4">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/48">
          SAYGOO Visual
        </p>
        <h3 className="mb-2 text-lg font-black uppercase leading-tight text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-white/70">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function VisualCard({ image, title, subtitle }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yResult = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -10, scale: 1.01 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-[270px] overflow-hidden rounded-[30px] border border-white/10 group"
    >
      <motion.img 
        src={image} 
        alt={title} 
        style={{ y: yResult, scale: 1.25 }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.5s] group-hover:scale-[1.35]" 
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#100B08] via-[#100B08]/25 to-transparent transition-opacity duration-700 group-hover:opacity-80" />
      <div className="relative z-10 flex h-full flex-col justify-end p-5 md:p-6 transition-transform duration-500 group-hover:-translate-y-2">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/50">
          SAYGOO Visual
        </p>
        <h3 className="mb-2 text-xl font-black uppercase leading-tight text-white md:text-2xl">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-white/72">{subtitle}</p>
      </div>
    </motion.div>
  );
}

function SolutionCard({ card, index, onConnectClick }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yResult = useTransform(scrollYProgress, [0, 1], ['-15%', '15%']);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -10, scale: 1.01 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      className="group overflow-hidden rounded-[34px] border border-white/10 bg-[#17100B]"
    >
      <div className="relative h-[320px] overflow-hidden">
        <motion.img
          src={card.image}
          alt={card.title}
          style={{ y: yResult, scale: 1.25 }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.35]"
        />
        <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-20 transition-opacity duration-500 group-hover:opacity-40`} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#120D08] via-[#120D08]/35 to-transparent" />
        <motion.div
          whileHover={{ scale: 1.06 }}
          className="absolute left-5 top-5 inline-flex rounded-full bg-white/88 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-[#2A1A10]"
        >
          {card.id}
        </motion.div>
      </div>

      <div className="p-6 md:p-7 relative z-10 bg-[#17100B] transition-transform duration-500">
        <h3 className="mb-3 text-2xl font-black uppercase text-white md:text-3xl">
          {card.title}
        </h3>
        <p className="mb-6 leading-relaxed text-white/65">{card.description}</p>
        <button
          type="button"
          onClick={onConnectClick}
          className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#F36F21]"
        >
          <span>Decouvrir ce module</span>
          <motion.span
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            →
          </motion.span>
        </button>
      </div>
    </motion.article>
  );
}
