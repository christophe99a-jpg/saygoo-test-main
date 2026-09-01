import React, { useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContextF';
import { DashboardShell } from '../components/dashboard/DashboardUI';
import { Package2, Wallet, Search, BellRing, Settings, Star, AlertCircle, TrendingUp, HelpCircle, User } from 'lucide-react';
const TransportCostSimulator = lazy(() => import('../components/simulateurs/TransportCostSimulator'));
const ProfileOperateur = lazy(() => import('../components/dashboard/ProfileOperateur'));
const WalletBoard = lazy(() => import('../components/dashboard/WalletBoard'));
import SidebarButton from '../components/dashboard/client/SidebarButton';
const ZoneCentrale = lazy(() => import('../components/dashboard/client/ZoneCentrale'));
const MarketplaceBoard = lazy(() => import('../components/dashboard/client/MarketplaceBoard'));
const CommandesBoard = lazy(() => import('../components/dashboard/client/CommandesBoard'));

/**
 * 5 Zones:
 * 1. Header intelligent -> Already mostly covered by DashboardShell but we add extra Search/Notifs here.
 * 2. Menu latéral -> AcheteurSidebar
 * 3. Zone Centrale (Cartes KPI, Suivi, IA Recommends, Fast marketplace, Alerts) -> AcheteurCenter
 * 4. Panneau Droit (Assistant IA, Support, Actions rapides) -> AcheteurRightPanel
 * 5. Zone Bas (Activité, Historique) -> AcheteurBottom
 */

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout, session } = useAuth();
  const [activeTab, setActiveTab] = useState('accueil');

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <DashboardShell
      badge="Opérateur Économique"
      title="SAYGOO Control Center"
      subtitle="Décision d'achat, suivi logistique et wallet intégré."
      session={session}
      onHome={() => navigate('/')}
      onLogout={handleLogout}
      actionSlot={
        <button 
          onClick={() => setActiveTab('wallet')}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/80 hover:text-white hover:bg-white/10 transition-all"
        >
          <Wallet className="h-4 w-4 text-[#FFBC82]" />
          <span>Wallet: 6.4M XOF</span>
        </button>
      }
    >
      <div className="flex flex-col lg:flex-row max-w-[1600px] mx-auto gap-6 pb-20">
        
        {/* Ligne 2: Menu latéral */}
        <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
          <SidebarButton active={activeTab === 'accueil'} onClick={() => setActiveTab('accueil')} icon={TrendingUp} label="Dashboard" />
          <SidebarButton active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')} icon={Package2} label="Marketplace" />
          <SidebarButton active={activeTab === 'commandes'} onClick={() => setActiveTab('commandes')} icon={BellRing} label="Mes Commandes" />
          <SidebarButton active={activeTab === 'transport'} onClick={() => setActiveTab('transport')} icon={Settings} label="Cotations" />
          <SidebarButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Wallet} label="Paiements" />
          <SidebarButton active={activeTab === 'profil'} onClick={() => setActiveTab('profil')} icon={User} label="Mon Profil (KYC)" />
        </aside>

        {/* Ligne 3: Zone Centrale */}
        <div className="flex-1 flex flex-col gap-6 opacity-100 min-w-0">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-white/50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F36F21]"></div></div>}>
            {activeTab === 'accueil' && <ZoneCentrale />}
            {activeTab === 'transport' && (
              <div className="w-full">
                <TransportCostSimulator />
              </div>
            )}
            {activeTab === 'profil' && (
              <div className="w-full">
                <ProfileOperateur />
              </div>
            )}
            {activeTab === 'wallet' && (
              <div className="w-full">
                <WalletBoard />
              </div>
            )}
            {activeTab === 'marketplace' && (
              <div className="w-full">
                <MarketplaceBoard />
              </div>
            )}
            {activeTab === 'commandes' && (
              <div className="w-full">
                <CommandesBoard />
              </div>
            )}
            {activeTab !== 'accueil' && activeTab !== 'transport' && activeTab !== 'profil' && activeTab !== 'wallet' && activeTab !== 'marketplace' && activeTab !== 'commandes' && (
               <div className="flex-1 flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-12 text-center text-white/50 backdrop-blur-md">
                 Module en cours de developpement.
               </div>
            )}
          </Suspense>
        </div>


        {/* Ligne 4: Panneau droit (Assistant IA) */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
          <div className="rounded-2xl border border-[#F36F21]/30 bg-[rgba(243,111,33,0.05)] p-5 backdrop-blur-md shadow-[0_0_40px_rgba(243,111,33,0.1)]">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#F36F21] mb-4 flex items-center gap-2">
              <Star className="h-4 w-4" /> Assistant SAYGOO
            </h3>
            <div className="bg-black/40 rounded-xl p-4 text-xs leading-relaxed text-white/70 h-40 overflow-y-auto font-medium shadow-inner border border-white/5">
              <p className="mb-2"><strong>SAYGOO IA:</strong> Bonjour ! Avez-vous besoin d'une cotation pour l'import de Riz depuis l'Inde aujourd'hui ?</p>
            </div>
            <div className="mt-4 flex gap-2">
              <input type="text" placeholder="Poser une question..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#F36F21]" />
              <button className="bg-[#F36F21] text-white px-3 py-2 rounded-lg text-xs font-bold">↵</button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Actions Rapides
            </h3>
            <div className="flex flex-col gap-2">
              <button onClick={() => navigate('/dossier/nouveau')} className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase py-3 rounded-xl border border-white/10 transition-colors">
                Soumettre un dédouanement
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase py-3 rounded-xl border border-white/10 transition-colors">
                Publier sur Marketplace
              </button>
            </div>
          </div>
        </aside>

      </div>
    </DashboardShell>
  );
}
