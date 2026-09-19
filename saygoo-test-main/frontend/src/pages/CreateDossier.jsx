import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import bgWave from '../assets/saygo-wave.jpg';
import { OperateurAPI, FichierAPI } from '../lib/apiF';

// Les libellés affichés doivent être traduits vers les valeurs attendues
// par le service de dédouanement (IMPORT / EXPORT / TRANSIT).
const OPERATION_VERS_BACKEND = {
  Importation: 'IMPORT',
  Exportation: 'EXPORT',
  'Transit ZLECAF': 'TRANSIT',
  Dedouanement: 'IMPORT',
};

const EMISSION_FACTORS = {
  Routier: 0.08,
  Maritime: 0.01,
  Aérien: 0.5,
};

const CreateDossier = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Profil & type d'opération
    raisonSociale: '',
    paysOrigine: '',
    portChargement: '',
    paysClient: '',
    valeurCaf: '',
    typeOperation: '',
    // Logistique
    natureMarchandise: '',
    codeHS: '',
    nombreConteneurs: '',
    modeTransport: 'Routier',
    poids: 0,
    lienGeolocalisation: '',
    distance: 0,
    ecoMode: false,
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

  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);
  const [dossierCree, setDossierCree] = useState(null);
  const [envoiFichiers, setEnvoiFichiers] = useState(false);

  const nextStep = () => setStep((s) => Math.min(4, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const soumettreDossier = async () => {
    if (!formData.typeOperation) {
      setErreurEnvoi("Sélectionnez la nature de l'opération à l'étape 1.");
      setStep(1);
      return;
    }
    if (!formData.raisonSociale?.trim()) {
      setErreurEnvoi('Renseignez la raison sociale à l\'étape 1.');
      setStep(1);
      return;
    }
    if (!formData.valeurCaf || Number(formData.valeurCaf) <= 0) {
      setErreurEnvoi('La valeur CAF est obligatoire : elle sert de base au calcul des droits.');
      setStep(1);
      return;
    }
    if (!formData.natureMarchandise?.trim()) {
      setErreurEnvoi('Renseignez la nature de la marchandise à l\'étape 2.');
      setStep(2);
      return;
    }

    setEnvoiEnCours(true);
    setErreurEnvoi(null);

    try {
      // Chaque donnée a désormais sa colonne côté back-end : les dossiers
      // restent filtrables par code SH, mode de transport ou service GMS.
      const reponse = await OperateurAPI.creerDedouanement({
        typeOperation: OPERATION_VERS_BACKEND[formData.typeOperation] || 'IMPORT',
        natureMarchandise: formData.natureMarchandise.trim(),

        // Profil
        paysOrigine: formData.paysOrigine || undefined,
        portChargement: formData.portChargement || undefined,
        destinationFinale: formData.paysClient || undefined,
        // CAF = Coût, Assurance, Fret — équivalent du CIF.
        valeurCaf: Number(formData.valeurCaf) || undefined,

        // Logistique
        hsCode: formData.codeHS || undefined,
        nombreConteneurs: Number(formData.nombreConteneurs) || undefined,
        modeTransport: formData.modeTransport || undefined,
        poidsBrut: Number(formData.poids) || undefined,
        distanceKm: Number(formData.distance) || undefined,
        lienGeolocalisation: formData.lienGeolocalisation || undefined,
        co2EstimeKg: Number(formData.co2Estime) || undefined,

        // Finances et services
        modePaiement: formData.modePaiement || undefined,
        paiementFractionne: Boolean(formData.paiementFractionne),
        servicesGMS: formData.servicesGMS?.length ? formData.servicesGMS : undefined,
      });

      const dossier = reponse.data?.dossier || null;
      setDossierCree(dossier);

      // Les pièces jointes ne peuvent être rattachées qu'une fois le dossier
      // créé : elles sont envoyées ensuite, dossier par dossier.
      if (dossier?.id && formData.documents?.length) {
        setEnvoiFichiers(true);
        const echecs = [];

        for (const doc of formData.documents) {
          try {
            // Le fichier lui-même est transmis en multipart et écrit sur le
            // serveur ; la fiche du document est créée dans la foulée.
            await FichierAPI.televerser(dossier.id, doc.type, doc.fichier);
          } catch (errFichier) {
            echecs.push(`${doc.type} (${errFichier.message})`);
          }
        }

        setEnvoiFichiers(false);

        if (echecs.length) {
          setErreurEnvoi(
            `Dossier créé, mais ces pièces n'ont pas pu être envoyées : ${echecs.join(' ; ')}. Vous pourrez les ajouter depuis le suivi.`,
          );
        }
      }
    } catch (err) {
      setErreurEnvoi(
        err.status === 503
          ? 'Le service de dédouanement est momentanément indisponible. Réessayez dans quelques instants.'
          : err.message || "L'envoi du dossier a échoué."
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

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
        {erreurEnvoi && (
          <div className="mx-8 mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-xs font-black uppercase text-red-600">{erreurEnvoi}</p>
          </div>
        )}

        {dossierCree && (
          <div className="mx-8 mb-4 rounded-[30px] bg-[#2A1A10] p-6 text-center">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#F36F21]">
              Dossier transmis au CDA
            </p>
            <h2 className="text-3xl font-black italic tracking-tighter text-white">
              {dossierCree.reference}
            </h2>
            <p className="mt-3 text-[11px] text-white/60">
              Suivez son avancement depuis « Suivi de mes demandes ».
            </p>
            <Link
              to="/dashboard/client"
              className="mt-5 inline-block rounded-full bg-[#F36F21] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white"
            >
              Retour au tableau de bord
            </Link>
          </div>
        )}
          <div className="mt-12 flex justify-between border-t pt-8">
            {step > 1 && (
              <button onClick={prevStep} className="text-[#2A1A10] font-black uppercase text-xs tracking-widest hover:text-[#F36F21]">
                ← Precedent
              </button>
            )}
            <button
              onClick={step === 4 ? soumettreDossier : nextStep}
              disabled={envoiEnCours || Boolean(dossierCree)}
              className="ml-auto bg-[#F36F21] text-white px-10 py-4 rounded-full font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#2A1A10] transition-all"
            >
              {step === 4
                ? (envoiFichiers
                    ? 'Envoi des pièces jointes…'
                    : envoiEnCours
                      ? 'Envoi en cours…'
                      : dossierCree
                        ? 'Dossier envoyé ✓'
                        : 'Soumettre le Dossier')
                : 'Suivant →'}
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
        <label className="text-[10px] font-black uppercase text-gray-400">Pays d'origine</label>
        <input
          type="text"
          placeholder="Chine, Inde, Brésil…"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.paysOrigine || ''}
          onChange={(e) => setData({ ...data, paysOrigine: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Port de chargement</label>
        <input
          type="text"
          placeholder="Shanghai, Anvers…"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.portChargement || ''}
          onChange={(e) => setData({ ...data, portChargement: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase text-gray-400">Pays de destination</label>
        <input
          type="text"
          placeholder="Togo"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.paysClient || ''}
          onChange={(e) => setData({ ...data, paysClient: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-black uppercase text-gray-400">
          Valeur CAF (XOF)
        </label>
        <input
          type="number"
          min="0"
          placeholder="14 800 000"
          className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
          value={data.valeurCaf || ''}
          onChange={(e) => setData({ ...data, valeurCaf: e.target.value })}
        />
        <p className="text-[10px] text-gray-400">
          Coût, Assurance et Fret — base de calcul des droits de douane.
        </p>
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
          <label className="text-[10px] font-black uppercase text-gray-400">Code SH (HS)</label>
          <input
            type="text"
            placeholder="8704.23"
            className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.codeHS || ''}
            onChange={(e) => setData({ ...data, codeHS: e.target.value })}
          />
          <p className="text-[10px] text-gray-400">
            Code du Système Harmonisé — détermine le taux de droits applicable.
          </p>
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

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase text-gray-400">Nombre de conteneurs</label>
          <input
            type="number"
            min="0"
            placeholder="2"
            className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.nombreConteneurs || ''}
            onChange={(e) => setData({ ...data, nombreConteneurs: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-[10px] font-black uppercase text-gray-400">
            Lien géolocalisé du lieu de destination
          </label>
          <input
            type="url"
            placeholder="https://maps.google.com/?q=6.1319,1.2228"
            className="p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#F36F21]"
            value={data.lienGeolocalisation || ''}
            onChange={(e) => setData({ ...data, lienGeolocalisation: e.target.value })}
          />
          <p className="text-[10px] text-gray-400">
            Lien Google Maps ou coordonnées GPS du point de livraison final.
          </p>
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

  // La référence du dossier est attribuée par le back-end à la soumission :
  // aucune référence n'est inventée côté navigateur.

  // Formats acceptés et taille maximale, alignés sur ce qu'attend le service
  // documentaire. Refuser tôt évite un envoi qui échouerait côté serveur.
  const FORMATS_ACCEPTES = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  const TAILLE_MAX_MO = 10;

  const [erreurFichier, setErreurFichier] = useState(null);

  const handleFileUpload = (docName, fichier) => {
    if (!fichier) return;

    const extension = `.${fichier.name.split('.').pop().toLowerCase()}`;
    if (!FORMATS_ACCEPTES.split(',').includes(extension)) {
      setErreurFichier(`Format non accepté (${extension}). Formats autorisés : PDF, JPG, PNG, DOC.`);
      return;
    }
    if (fichier.size > TAILLE_MAX_MO * 1024 * 1024) {
      setErreurFichier(`« ${fichier.name} » dépasse ${TAILLE_MAX_MO} Mo.`);
      return;
    }

    setErreurFichier(null);

    // On conserve le fichier lui-même : il sera transmis après création du
    // dossier, une fois que le back-end aura attribué une référence.
    const autres = (data.documents || []).filter((d) => d.type !== docName);
    setData({
      ...data,
      documents: [
        ...autres,
        { type: docName, nom: fichier.name, taille: fichier.size, fichier },
      ],
    });
  };

  const retirerFichier = (docName) => {
    setData({ ...data, documents: (data.documents || []).filter((d) => d.type !== docName) });
    setErreurFichier(null);
  };

  const documentCharge = (docName) => (data.documents || []).find((d) => d.type === docName);

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
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-gray-600 uppercase">{doc}</span>
                {documentCharge(doc) && (
                  <p className="mt-0.5 truncate text-[10px] text-gray-400">
                    {documentCharge(doc).nom} · {(documentCharge(doc).taille / 1024).toFixed(0)} Ko
                  </p>
                )}
              </div>

              {documentCharge(doc) ? (
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-lg bg-green-100 px-3 py-1 text-[10px] font-black uppercase text-green-600">
                    Chargé ✓
                  </span>
                  <button
                    type="button"
                    onClick={() => retirerFichier(doc)}
                    className="rounded-lg px-2 py-1 text-[10px] font-black uppercase text-gray-400 hover:text-red-500"
                    title="Retirer ce fichier"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                // Le label déclenche l'input masqué : c'est lui qui ouvre
                // l'explorateur de fichiers du téléphone ou de l'ordinateur.
                <label className="shrink-0 cursor-pointer rounded-lg bg-[#2A1A10] px-3 py-1 text-[10px] font-black uppercase text-white hover:bg-[#F36F21]">
                  Uploader
                  <input
                    type="file"
                    accept={FORMATS_ACCEPTES}
                    className="hidden"
                    onChange={(e) => {
                      handleFileUpload(doc, e.target.files?.[0]);
                      // Réinitialise pour permettre de re-sélectionner le même fichier.
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        {erreurFichier && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-[11px] font-bold text-red-600">
            {erreurFichier}
          </p>
        )}

        <p className="text-[10px] text-gray-400">
          Formats acceptés : PDF, JPG, PNG, DOC — {TAILLE_MAX_MO} Mo maximum par fichier.
        </p>
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

      {signed && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-8 rounded-[30px] bg-[#2A1A10] p-6 text-center"
        >
          <p className="text-[11px] font-bold text-white/70">
            Cliquez sur « Soumettre le Dossier » pour transmettre votre demande au CDA.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CreateDossier;
