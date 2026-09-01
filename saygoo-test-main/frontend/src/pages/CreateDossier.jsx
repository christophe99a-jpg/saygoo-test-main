import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import bgWave from '../assets/saygo-wave.jpg';

const EMISSION_FACTORS = {
  Routier: 0.08,
  Maritime: 0.01,
  Aérien: 0.5,
};

const CreateDossier = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Point 1 & 2
    raisonSociale: '',
    paysClient: '',
    typeOperation: '',
    // Point 3 & 4
    paysOrigine: '',
    poids: 0,
    distance: 0,
    modeTransport: 'Routier',
    ecoMode: false,
    natureMarchandise: '',
    co2Estime: '',
    // Point 5 & 7
    modePaiement: 'Virement',
    servicesGMS: [],
    notifierGMS: false,
    paiementFractionne: false,
    // Point 6
    documents: [],
    referenceDDC: '',
  });

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const progress = useMemo(() => (step / 4) * 100, [step]);
  const pageVariants = {
    hidden: { opacity: 0, y: 22 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.08 },
    },
  };
  const blockVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div
      className="min-h-screen bg-[#0E0A07] pt-24 pb-12 px-4 relative"
      style={{
        backgroundImage: `url(${bgWave})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0E0A07]/90 via-[#0E0A07]/75 to-[#0E0A07]/95" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto bg-white/95 rounded-[40px] shadow-2xl overflow-hidden border border-white/60"
        variants={pageVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div className="p-6 pb-0 flex justify-between items-center" variants={blockVariants}>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-[#2A1A10] font-black uppercase text-xs tracking-widest hover:text-[#F36F21]"
            >
              ← Accueil
            </Link>
            <Link
              to="/dashboard/client"
              className="text-[#2A1A10] font-black uppercase text-xs tracking-widest hover:text-[#F36F21]"
            >
              Retour Dashboard
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.35em] text-gray-400">Creation Dossier</span>
          </div>
        </motion.div>

        {/* INDICATEUR DE PROGRESSION (STEPPER) */}
        <motion.div className="bg-[#2A1A10] p-8 text-white" variants={blockVariants}>
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${step === s ? 'bg-[#F36F21]' : 'bg-white/20'}`}>
                  {s}
                </div>
                <span className={`hidden md:block text-[10px] uppercase font-bold tracking-widest ${step === s ? 'text-white' : 'text-white/50'}`}>
                  {s === 1 && 'Profil'}
                  {s === 2 && 'Logistique'}
                  {s === 3 && 'Finances'}
                  {s === 4 && 'Documents'}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
            <div className="h-full bg-[#F36F21] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </motion.div>

        {/* CONTENU DU FORMULAIRE */}
        <motion.div className="p-10" variants={blockVariants}>
          {step === 1 && <StepIdentification data={formData} setData={setFormData} />}
          {step === 2 && <StepLogistique data={formData} setData={setFormData} />}
          {step === 3 && <StepFinances data={formData} setData={setFormData} />}
          {step === 4 && <StepDocumentsValidation data={formData} setData={setFormData} />}

          {/* NAVIGATION */}
          <div className="mt-12 flex justify-between border-t pt-8">
            {step > 1 && (
              <button onClick={prevStep} className="text-[#2A1A10] font-black uppercase text-xs tracking-widest hover:text-[#F36F21]">
                ← Precedent
              </button>
            )}
            <button
              onClick={step === 4 ? () => console.log('Final Submit', { ...formData }) : nextStep}
              className="ml-auto bg-[#F36F21] text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#2A1A10] transition-all"
            >
              {step === 4 ? 'Soumettre le Dossier' : 'Suivant →'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// --- ETAPE 1: Profil & Type d'Operation ---
const StepIdentification = ({ data, setData }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
    <h2 className="text-2xl font-black text-[#2A1A10] mb-6 italic uppercase tracking-tighter">
      1. Profil & <span className="text-[#F36F21]">Type d'Operation</span>
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Raison Sociale</label>
        <input
          type="text"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.raisonSociale}
          onChange={(e) => setData({ ...data, raisonSociale: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Pays du Client</label>
        <input
          type="text"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.paysClient || ''}
          onChange={(e) => setData({ ...data, paysClient: e.target.value })}
        />
      </div>
    </div>

    <div className="mt-8">
      <label className="text-[10px] font-black uppercase text-gray-400 mb-4 block">Nature de l'operation</label>
      <div className="grid grid-cols-2 gap-4">
        {['Importation', 'Exportation', 'Transit ZLECAF', 'Dedouanement'].map((type) => (
          <button
            key={type}
            onClick={() => setData({ ...data, typeOperation: type })}
            className={`p-4 rounded-2xl border-2 font-bold text-xs uppercase tracking-widest transition-all ${data.typeOperation === type ? 'border-[#F36F21] bg-[#F36F21]/5 text-[#F36F21]' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  </motion.div>
);

// --- ETAPE 2: Informations Expédition & Green Transport ---
const StepLogistique = ({ data, setData }) => {
  useEffect(() => {
    const poidsTonne = Number(data.poids || 0) / 1000;
    const factor = EMISSION_FACTORS[data.modeTransport] || 0;
    const estimation = Number(data.distance || 0) * poidsTonne * factor;
    setData((prev) => ({ ...prev, co2Estime: estimation.toFixed(2) }));
  }, [data.poids, data.distance, data.modeTransport, setData]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <h2 className="text-2xl font-black text-[#2A1A10] mb-6 italic uppercase tracking-tighter">
        2. Details <span className="text-[#F36F21]">Logistiques & CO2</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Pays d'origine</label>
          <input
            type="text"
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.paysOrigine}
            onChange={(e) => setData({ ...data, paysOrigine: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Nature de la marchandise</label>
          <input
            type="text"
            placeholder="Ex: Produits perissables"
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.natureMarchandise}
            onChange={(e) => setData({ ...data, natureMarchandise: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Mode de Transport</label>
          <select
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21] appearance-none font-bold text-xs cursor-pointer"
            value={data.modeTransport}
            onChange={(e) => setData({ ...data, modeTransport: e.target.value })}
          >
            <option value="Routier">🚛 Routier</option>
            <option value="Maritime">🚢 Maritime</option>
            <option value="Aérien">✈️ Aerien</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Poids Total (kg)</label>
          <input
            type="number"
            min="0"
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.poids}
            onChange={(e) => setData({ ...data, poids: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Distance Prevue (km)</label>
          <input
            type="number"
            min="0"
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.distance}
            onChange={(e) => setData({ ...data, distance: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-8 p-6 bg-[#F5F5DC]/30 border-2 border-dashed border-[#F36F21]/30 rounded-[30px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-[#2A1A10] font-black text-xs uppercase tracking-widest flex items-center gap-2">
            🌱 Estimation Green Transport
          </h4>
          <p className="text-[10px] text-gray-500 font-bold italic mt-1">
            Calcule selon la norme SAYGOO (Distance × Poids × Facteur d'emission)
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-black text-[#F36F21]">{data.co2Estime || 0}</span>
          <span className="text-xs font-black text-[#2A1A10] ml-2 uppercase">kg CO2</span>
        </div>
      </div>
    </motion.div>
  );
};

// --- ETAPE 3: Informations Financières & Services GMS ---
const StepFinances = ({ data, setData }) => {
  const gmsPacks = [
    { id: 'insight', name: 'MARITIME INSIGHT', desc: 'Expertise & Inspection Integrale' },
    { id: 'shield', name: 'RISK SHIELD', desc: 'Prevention & Gestion des Risques' },
    { id: 'expert', name: 'AFRICA EXPERT', desc: 'Conseil, Audit & Gouvernance' },
  ];

  const toggleGMS = (packId) => {
    const activePacks = data.servicesGMS || [];
    const newPacks = activePacks.includes(packId)
      ? activePacks.filter((id) => id !== packId)
      : [...activePacks, packId];
    setData({ ...data, servicesGMS: newPacks, notifierGMS: newPacks.length > 0 });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <h2 className="text-2xl font-black text-[#2A1A10] mb-6 italic uppercase tracking-tighter">
        3. Finances & <span className="text-[#F36F21]">Services GMS</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Mode de paiement souhaite</label>
          <select
            className="p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-[#F36F21] font-bold text-xs"
            value={data.modePaiement}
            onChange={(e) => setData({ ...data, modePaiement: e.target.value })}
          >
            <option value="Virement">🏦 Virement Bancaire</option>
            <option value="MobileMoney">📱 Mobile Money</option>
            <option value="Autre">📄 Autre</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Paiement fractionne ?</label>
          <div className="flex gap-4 h-full items-center">
            {['Oui', 'Non'].map((opt) => (
              <button
                key={opt}
                onClick={() => setData({ ...data, paiementFractionne: opt === 'Oui' })}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border-2 transition-all ${data.paiementFractionne === (opt === 'Oui') ? 'border-[#F36F21] text-[#F36F21] bg-[#F36F21]/5' : 'border-gray-100 text-gray-400'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-black uppercase text-gray-400 block mb-4">
          Services Complementaires GMS (Notification automatique)
        </label>

        <div className="grid grid-cols-1 gap-3">
          {gmsPacks.map((pack) => (
            <div
              key={pack.id}
              onClick={() => toggleGMS(pack.id)}
              className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex justify-between items-center ${data.servicesGMS?.includes(pack.id) ? 'border-[#F36F21] bg-yellow-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div>
                <h4 className="text-xs font-black text-[#2A1A10] uppercase">{pack.name}</h4>
                <p className="text-[10px] text-gray-500 font-bold italic">{pack.desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${data.servicesGMS?.includes(pack.id) ? 'bg-[#F36F21] border-[#F36F21]' : 'border-gray-200'}`}>
                {data.servicesGMS?.includes(pack.id) && <span className="text-white text-[10px]">✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data.notifierGMS && (
        <div className="mt-6 rounded-2xl border border-[#F36F21]/30 bg-[#F36F21]/10 p-4">
          <p className="text-xs font-black uppercase tracking-widest text-[#F36F21]">Notification GMS</p>
          <p className="text-sm font-bold text-[#2A1A10]">Une notification GMS sera envoyee apres validation.</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-2xl text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center">
        Taux applicables : RTN (0,25% - 0,5%) | RGT (0,015% Valeur CAF)
      </div>
    </motion.div>
  );
};

// --- ETAPE 4: Documents & Validation ---
const StepDocumentsValidation = ({ data, setData }) => {
  const [signed, setSigned] = useState(false);

  const requiredDocs = [
    'Facture commerciale ou proforma',
    'Connaissement (B/L) ou Lettre de transport',
    "Certificat d'origine",
    'Liste de colisage',
  ];

  const generateDDC = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(1000000 + Math.random() * 9000000);
    return `DDC${year}${random}`;
  };

  const handleFileUpload = (docName) => {
    const newDocs = [...(data.documents || []), docName];
    setData({ ...data, documents: newDocs, referenceDDC: generateDDC() });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <h2 className="text-2xl font-black text-[#2A1A10] mb-6 italic uppercase tracking-tighter">
        4. Documents & <span className="text-[#F36F21]">Validation</span>
      </h2>

      <div className="space-y-4 mb-10">
        <label className="text-[10px] font-black uppercase text-gray-400 block">Pieces Jointes Obligatoires</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requiredDocs.map((doc, index) => (
            <div
              key={index}
              className="p-4 border-2 border-dashed border-gray-100 rounded-2xl flex items-center justify-between hover:border-[#F36F21]/30 transition-all"
            >
              <span className="text-[10px] font-bold text-gray-600 uppercase">{doc}</span>
              <button
                onClick={() => handleFileUpload(doc)}
                className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${data.documents?.includes(doc) ? 'bg-green-100 text-green-600' : 'bg-[#2A1A10] text-white'}`}
              >
                {data.documents?.includes(doc) ? 'Charge ✓' : 'Uploader'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-[30px] border border-gray-100">
        <h3 className="text-xs font-black text-[#2A1A10] uppercase mb-4">Certification du Client</h3>
        <p className="text-[11px] text-gray-500 italic mb-6">
          &quot;Je certifie sur l'honneur que les informations ci-dessus sont exactes et sollicite la creation d'un dossier client auprès du CDA via la plateforme SAYGOO.&quot;
        </p>

        <div className="flex items-center gap-4">
          <input
            type="checkbox"
            id="sign"
            className="w-5 h-5 accent-[#F36F21]"
            onChange={(e) => setSigned(e.target.checked)}
          />
          <label htmlFor="sign" className="text-[10px] font-black text-[#2A1A10] uppercase cursor-pointer">
            Accepter et signer numeriquement
          </label>
        </div>
      </div>

      {signed && data.referenceDDC && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-8 p-6 bg-[#2A1A10] rounded-[30px] text-center"
        >
          <p className="text-[10px] font-black text-[#F36F21] uppercase tracking-[0.3em] mb-2">Reference Generee</p>
          <h2 className="text-3xl font-black text-white tracking-tighter italic">{data.referenceDDC}</h2>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CreateDossier;
