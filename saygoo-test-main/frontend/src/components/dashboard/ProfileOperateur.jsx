import React, { useState } from 'react';
import { Package, Key, ShieldCheck, ChevronRight, CheckCircle2, Copy } from 'lucide-react';
import { useAuth } from '../../auth/AuthContextF';

export default function ProfileOperateur() {
  const { session } = useAuth();
  const [activePack, setActivePack] = useState('standard');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 backdrop-blur-md">
        <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-white">Profil Opérateur Économique</h2>
        <p className="mt-2 text-sm text-white/50">Gérez vos abonnements, vos informations KYC légales et vos clés API Business.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identité & KYC */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-black/20 p-8 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#F36F21] mb-6 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Certification KYC
            </h3>
            
            <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Raison Sociale</p>
                <p className="text-sm font-black text-white mt-1 uppercase">{session?.profile?.companyName || 'SAYGOO SARL'}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Statut</p>
                <div className="mt-1 inline-flex items-center gap-1 bg-[#4CC38A]/20 text-[#4CC38A] px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-[#4CC38A]/30">
                  <CheckCircle2 className="h-3 w-3" /> Vérifié
                </div>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Numéro RCCM</p>
                <p className="text-sm font-bold text-white mt-1">TG-LOM-2023-B-1142</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Identifiant Fiscal (NIF)</p>
                <p className="text-sm font-bold text-white mt-1">1001458923</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Email Administrateur</p>
                <p className="text-sm font-bold text-white mt-1">{session?.profile?.email || 'admin@saygoo.tg'}</p>
              </div>
            </div>
          </div>
          
          <button className="self-start text-[10px] font-black uppercase tracking-[0.2em] text-[#FFBC82] hover:text-white transition-colors flex items-center gap-1">
            Mettre à jour les documents <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* API Business */}
        <div className="rounded-2xl border border-[#F36F21]/20 bg-[linear-gradient(135deg,rgba(0,0,0,0.5),rgba(243,111,33,0.05))] p-6 backdrop-blur-md">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#F36F21] mb-4 flex items-center gap-2">
            <Key className="h-4 w-4" /> API Business 1.3.0
          </h3>
          <p className="text-[10px] text-white/60 mb-6 leading-relaxed font-bold">
            Intégrez vos systèmes ERP (SAGE, SAP) avec l'API Plateforme d'Interopérabilité PI (Demandes, Mises en MAD).
          </p>

          <div className="bg-black/60 rounded-xl p-4 border border-white/5 mb-4 relative group">
            <p className="text-[9px] text-white/40 uppercase tracking-widest mb-1 font-bold">Clé Secrète Production</p>
            <p className="text-xs font-mono text-[#FFBC82] tracking-wider break-all">
              {apiKeyVisible ? 'sk_prod_89fA2...39vP' : '••••••••••••••••••••'}
            </p>
            <button 
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
              className="absolute top-4 right-4 text-white/40 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <button className="w-full rounded-xl bg-white/5 border border-white/10 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-[#F36F21] hover:border-[#F36F21] transition-all">
            Générer Nouvelle Clé
          </button>
        </div>
      </div>

      {/* Plans & Packages */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-8 backdrop-blur-md">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FFBC82] mb-6 flex items-center gap-2">
          <Package className="h-4 w-4" /> Gestion des Packs MAD & Stock
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PackCard 
            title="Standard" 
            price="Gratuit" 
            desc="Dédouanement à l'acte."
            features={['Accès Marketplace', 'Cotation Transport', '1 Utilisateur']}
            isActive={activePack === 'standard'}
            onClick={() => setActivePack('standard')}
          />
          <PackCard 
            title="Gold" 
            price="49.000 XOF/Mois" 
            desc="Option Mise à disposition (MAD)"
            features={['Gestion de Stock (Jusqu\'à 20M XOF)', 'Accès API Business', 'Support Prioritaire', '3 Utilisateurs']}
            isActive={activePack === 'gold'}
            isHighlighted
            onClick={() => setActivePack('gold')}
          />
          <PackCard 
            title="Diamond" 
            price="Sur Devis" 
            desc="Sourcing & Stock Illimité"
            features={['Garantie Bancaire Intégrée', 'Volume de Stock Illimité', 'Account Manager Dédié', 'Utilisateurs Illimités']}
            isActive={activePack === 'diamond'}
            onClick={() => setActivePack('diamond')}
          />
        </div>
      </div>
    </div>
  );
}

function PackCard({ title, price, desc, features, isActive, isHighlighted, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl border p-6 transition-all duration-300 overflow-hidden ${
        isActive 
          ? 'border-[#F36F21] bg-[#F36F21]/10 shadow-[0_10px_40px_rgba(243,111,33,0.15)]' 
          : isHighlighted 
            ? 'border-[#FFBC82]/30 bg-white/5 hover:border-[#F36F21]/50'
            : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      {isActive && (
        <div className="absolute top-0 right-0 bg-[#F36F21] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
          Actuel
        </div>
      )}
      <h4 className={`text-xl font-black uppercase ${isActive || isHighlighted ? 'text-[#F36F21]' : 'text-white'}`}>{title}</h4>
      <p className="text-2xl font-black text-white mt-1 mb-2">{price}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-6">{desc}</p>
      
      <ul className="space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-white/70 font-medium">
            <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${isActive ? 'text-[#F36F21]' : 'text-white/30'}`} />
            {f}
          </li>
        ))}
      </ul>

      {!isActive && (
        <button className={`w-full mt-6 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
          isHighlighted 
            ? 'border-[#F36F21] text-[#F36F21] hover:bg-[#F36F21] hover:text-white' 
            : 'border-white/20 text-white/50 hover:bg-white/10 hover:text-white'
        }`}>
          Souscrire
        </button>
      )}
    </div>
  );
}
