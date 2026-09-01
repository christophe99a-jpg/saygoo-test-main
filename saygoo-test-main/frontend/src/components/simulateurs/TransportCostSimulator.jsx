import React, { useState } from 'react';
import { BusinessAPI } from '../../lib/apiF';

export default function TransportCostSimulator() {
  const [formData, setFormData] = useState({
    distance_km: 300,
    fuel_price: 695,
    consumption_l_per_km: 0.3,
    weight_tons: 10,
    axle_capacity_tons: 5,
    cost_per_km: 800,
    cargo_value: 5000000,
    risk_level: 'medium',
    conditions: { night: false, rain: false, heat: false },
    carbon_price_per_kg: 50,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const simulateCost = async () => {
    setLoading(true);
    try {
      const response = await BusinessAPI.calculateTransport(formData);
      setResult(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-8 backdrop-blur-md">
      <h3 className="text-xl font-black uppercase text-[#F36F21] mb-6">Simulateur de Coût de Transport</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="text-[10px] font-bold uppercase text-white/50 block mb-2">Distance (km)</label>
          <input 
            type="number" 
            value={formData.distance_km}
            onChange={(e) => setFormData({...formData, distance_km: Number(e.target.value)})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F36F21]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-white/50 block mb-2">Poids de la marchandise (Tonnes)</label>
          <input 
            type="number" 
            value={formData.weight_tons}
            onChange={(e) => setFormData({...formData, weight_tons: Number(e.target.value)})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F36F21]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-white/50 block mb-2">Valeur de la marchandise (FCFA)</label>
          <input 
            type="number" 
            value={formData.cargo_value}
            onChange={(e) => setFormData({...formData, cargo_value: Number(e.target.value)})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F36F21]"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-white/50 block mb-2">Niveau de risque assurance</label>
          <select 
            value={formData.risk_level}
            onChange={(e) => setFormData({...formData, risk_level: e.target.value})}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#F36F21] appearance-none"
          >
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
          </select>
        </div>
      </div>

      <button 
        onClick={simulateCost}
        disabled={loading}
        className="bg-[#F36F21] text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#ff8d46] transition-colors"
      >
        {loading ? 'Calcul en cours...' : 'Lancer la Simulation'}
      </button>

      {result && (
        <div className="mt-8 p-6 bg-white/5 border border-[#F36F21]/30 rounded-2xl">
          <h4 className="text-sm font-black uppercase text-white mb-4">Résultat de la Simulation</h4>
          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-white/80 uppercase">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Transport de Base :</span>
              <span className="text-[#FFBC82]">{result.cost_breakdown.base_transport.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Carburant :</span>
              <span className="text-[#FFBC82]">{result.cost_breakdown.fuel_cost.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Poids :</span>
              <span className="text-[#FFBC82]">{result.cost_breakdown.weight_cost.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Assurance :</span>
              <span className="text-[#FFBC82]">{result.cost_breakdown.insurance_cost.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Taxe Carbone :</span>
              <span className="text-[#FFBC82]">{result.cost_breakdown.carbon_cost.toLocaleString()} XOF</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span>Facteur Temps :</span>
              <span className="text-[#FFBC82]">x {result.time_factor}</span>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-end border-t border-[#F36F21]/30 pt-6">
            <div>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-black">Coût Total Estimé (Marge Inclus)</p>
            </div>
            <p className="text-3xl font-black text-[#F36F21]">
              {result.recommended_price_with_margin.toLocaleString()} <span className="text-sm">XOF</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
