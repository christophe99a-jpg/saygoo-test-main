import React, { useState } from 'react';
import { TarificationAPI } from '../../lib/apiF';

// Champs du simulateur, alignés sur la formule SAYGOO :
// CT = (D × Cg × Cc) + (T × Ch) + Ht + Am + Fr
const CHAMPS = [
  { cle: 'distanceKm', label: 'Distance (km)', pas: 10 },
  { cle: 'tempsHeures', label: 'Temps de transport (h)', pas: 1 },
  { cle: 'consommationLitreCent', label: 'Consommation (L/100 km)', pas: 1 },
  { cle: 'prixGasoilParLitre', label: 'Prix du gasoil (XOF/L)', pas: 5 },
  { cle: 'coutHoraire', label: "Coût horaire d'exploitation", pas: 500 },
  { cle: 'honorairesTransporteur', label: 'Honoraires transporteur', pas: 5000 },
  { cle: 'primeAssurance', label: 'Prime d\u2019assurance', pas: 5000 },
  { cle: 'fraisRoute', label: 'Frais de route (péages…)', pas: 5000 },
];

const LIBELLES_DETAIL = {
  coutCarburant: 'Carburant',
  coutExploitation: 'Exploitation',
  honorairesTransporteur: 'Honoraires transporteur',
  primeAssurance: 'Assurance',
  fraisRoute: 'Frais de route',
};

export default function TransportCostSimulator() {
  const [formData, setFormData] = useState({
    distanceKm: 350,
    tempsHeures: 8,
    consommationLitreCent: 25,
    prixGasoilParLitre: 766,
    coutHoraire: 5000,
    honorairesTransporteur: 50000,
    primeAssurance: 25000,
    fraisRoute: 40000,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [co2, setCo2] = useState(null);
  const [erreur, setErreur] = useState(null);

  const simulateCost = async () => {
    setLoading(true);
    setErreur(null);

    try {
      const [reponseCout, reponseCo2] = await Promise.all([
        TarificationAPI.coutRevient(formData),
        TarificationAPI.emissionsCO2({
          distanceKm: formData.distanceKm,
          consommationLitreCent: formData.consommationLitreCent,
        }),
      ]);

      setResult(reponseCout.data);
      setCo2(reponseCo2.data);
    } catch (err) {
      setErreur(err.message || 'Le service de tarification est indisponible.');
      setResult(null);
      setCo2(null);
    } finally {
      setLoading(false);
    }
  };

  const majChamp = (cle, valeur) =>
    setFormData((precedent) => ({ ...precedent, [cle]: Number(valeur) }));

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-8 backdrop-blur-md">
      <h3 className="text-xl font-black uppercase text-[#F36F21] mb-2">Simulateur de Coût de Transport</h3>
      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-6">
        Formule SAYGOO — CT = ((D × Cg) ÷ 100 × Cc) + (T × Ch) + Ht + Am + Fr
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {CHAMPS.map(({ cle, label, pas }) => (
          <div key={cle}>
            <label htmlFor={cle} className="text-[10px] font-bold uppercase text-white/50 block mb-2">
              {label}
            </label>
            <input
              id={cle}
              type="number"
              step={pas}
              min="0"
              value={formData[cle]}
              onChange={(e) => majChamp(cle, e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F36F21]"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={simulateCost}
        disabled={loading}
        className="w-full rounded-xl bg-[#F36F21] px-6 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-[#d95f18] disabled:opacity-50"
      >
        {loading ? 'Calcul en cours…' : 'Simuler le coût'}
      </button>

      {erreur && (
        <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-bold uppercase text-red-300">
          {erreur}
        </p>
      )}

      {result && (
        <div className="mt-8 p-6 bg-white/5 border border-[#F36F21]/30 rounded-2xl">
          <h4 className="text-sm font-black uppercase text-white mb-4">Résultat de la Simulation</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-white/80 uppercase">
            {Object.entries(LIBELLES_DETAIL).map(([cle, label]) => (
              <div key={cle} className="flex justify-between border-b border-white/5 pb-2">
                <span>{label} :</span>
                <span className="text-[#FFBC82]">
                  {(result.detail?.[cle] ?? 0).toLocaleString('fr-FR')} XOF
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-end border-t border-[#F36F21]/30 pt-6">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">
                Coût total de revient
              </p>
              {co2 && (
                <p className="mt-1 text-[10px] uppercase tracking-widest text-[#4CC38A]">
                  {co2.emissionsKgCO2.toLocaleString('fr-FR')} kg CO₂ · {co2.litresConsommes.toLocaleString('fr-FR')} L
                </p>
              )}
            </div>
            <p className="text-3xl font-black text-[#F36F21]">
              {result.coutTotal.toLocaleString('fr-FR')} <span className="text-sm">{result.devise}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}