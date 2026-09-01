import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Plus, 
  CreditCard, 
  History,
  TrendingUp,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';

import { MetricTile, ProgressBar, SpotlightCard } from './DashboardUI';

const TRANSACTIONS = [
  { id: 1, type: 'payment', title: 'Dédouanement BL-7721', amount: '-450,000 XOF', date: '27 Avr 2026', status: 'Confirmé' },
  { id: 2, type: 'topup', title: 'Recharge Mobile Money', amount: '+1,200,000 XOF', date: '25 Avr 2026', status: 'Confirmé' },
  { id: 3, type: 'payment', title: 'Frais de livraison #8992', amount: '-25,000 XOF', date: '24 Avr 2026', status: 'Confirmé' },
  { id: 4, type: 'payment', title: 'Location Entrepôt Zone A', amount: '-150,000 XOF', date: '22 Avr 2026', status: 'Confirmé' },
  { id: 5, type: 'topup', title: 'Virement Bancaire BC-009', amount: '+5,000,000 XOF', date: '20 Avr 2026', status: 'En attente' },
];

export default function WalletBoard({ focusMode }) {
  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Solde Principal */}
      <SpotlightCard className="col-span-12 xl:col-span-8 p-6 md:p-10 relative">
        <div className="absolute right-10 top-10 opacity-10">
          <Wallet size={120} className="text-[#FFBC82]" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 text-[#FFBC82]">
            <ShieldCheck size={20} />
            <p className="text-[10px] font-black uppercase tracking-[0.32em]">Compte Sécurisé SAYGOO</p>
          </div>
          
          <h3 className="mt-8 text-[11px] font-black uppercase tracking-[0.4em] text-white/40">Solde Actuel</h3>
          <div className="mt-2 flex flex-col md:flex-row md:items-end gap-6">
            <p className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              6,425,000 <span className="text-2xl md:text-3xl text-[#FFBC82] font-black">XOF</span>
            </p>
            <div className="flex items-center gap-2 mb-2 text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full">
              <TrendingUp size={16} />
              <span className="text-xs font-bold">+12.4% ce mois</span>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <button className="flex items-center gap-3 bg-[#F36F21] hover:bg-[#ff8a45] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#F36F21]/20">
              <Plus size={20} />
              Recharger
            </button>
            <button className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-[0.1em] transition-all">
              <ArrowUpRight size={20} />
              Transférer
            </button>
          </div>
        </div>
      </SpotlightCard>

      {/* Méthodes de paiement rapides */}
      <SpotlightCard className="col-span-12 xl:col-span-4 p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#FFBC82]">Raccourcis Paiement</p>
        <h3 className="mt-4 text-2xl font-black uppercase text-white">Méthodes liées</h3>
        
        <div className="mt-6 space-y-3">
          <PaymentMethod icon={Smartphone} label="Orange Money" detail="07 58 44 XX XX" />
          <PaymentMethod icon={Smartphone} label="MTN MoMo" detail="05 01 22 XX XX" />
          <PaymentMethod icon={CreditCard} label="Visa Business" detail="**** 8890" />
          
          <button className="w-full mt-4 flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-[#F36F21]/40 py-4 rounded-2xl text-white/40 hover:text-white transition-all">
            <Plus size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ajouter une méthode</span>
          </button>
        </div>
      </SpotlightCard>

      {/* Historique des transactions */}
      <SpotlightCard className="col-span-12 xl:col-span-12 p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 text-[#FFBC82]">
              <History size={18} />
              <p className="text-[10px] font-black uppercase tracking-[0.32em]">Historique</p>
            </div>
            <h3 className="mt-3 text-2xl font-black uppercase text-white">Dernières opérations</h3>
          </div>
          <button className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-[#FFBC82] transition-colors">
            Voir tout le relevé
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Détails</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Date</th>
                <th className="pb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Status</th>
                <th className="pb-4 text-right text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-5 pr-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl border ${
                        tx.type === 'topup' 
                        ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' 
                        : 'bg-[#F36F21]/10 border-[#F36F21]/20 text-[#FFBC82]'
                      }`}>
                        {tx.type === 'topup' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white group-hover:text-[#FFBC82] transition-colors">{tx.title}</p>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/40 mt-1">
                          REF-{Math.random().toString(36).substr(2, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 text-sm text-white/60">{tx.date}</td>
                  <td className="py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.1em] ${
                      tx.status === 'Confirmé' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className={`py-5 text-right font-black ${
                    tx.type === 'topup' ? 'text-emerald-400' : 'text-white'
                  }`}>
                    {tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}

function PaymentMethod({ icon: Icon, label, detail }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-black/20 hover:border-[#F36F21]/20 transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-white/5 group-hover:bg-[#F36F21]/10 group-hover:text-[#FFBC82] transition-colors text-white/60">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{label}</p>
          <p className="text-sm font-bold text-white mt-1">{detail}</p>
        </div>
      </div>
      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[#FFBC82]">
        <Plus size={16} />
      </button>
    </div>
  );
}
