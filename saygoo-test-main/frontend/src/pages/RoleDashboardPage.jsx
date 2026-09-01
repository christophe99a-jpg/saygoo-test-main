import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContextF';
import { getRoleDefinition } from '../auth/roles';
import {
  CommandButton,
  CommandPalette,
  DashboardShell,
  MetricTile,
  SectionIntro,
  SegmentedPills,
} from '../components/dashboard/DashboardUI';
const WalletBoard = lazy(() => import('../components/dashboard/WalletBoard'));
import { ROLE_SCREENS } from '../config/dashboardScreens';

export default function RoleDashboardPage({ roleKey }) {
  const navigate = useNavigate();
  const { clearRole, logout, session } = useAuth();
  const role = getRoleDefinition(roleKey);
  const screen = ROLE_SCREENS[role.key] || ROLE_SCREENS.ROLE_CDA;
  const [focusMode, setFocusMode] = useState(screen.focusModes[0]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Dynamically select the board component based on focusMode
  const BoardComponent = focusMode === 'Portefeuille' ? WalletBoard : screen.component;

  useEffect(() => {
    setFocusMode(screen.focusModes[0]);
  }, [screen]);


  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleChangeProfile = () => {
    clearRole();
    navigate('/selection-profil', { replace: true });
  };

  const paletteItems = [
    ...screen.focusModes.map((mode) => ({
      label: `Focus ${mode}`,
      description: `Mettre en avant le module ${mode.toLowerCase()} pour le role courant.`,
      shortcut: mode,
      onSelect: () => setFocusMode(mode),
    })),
    {
      label: 'Changer de profil',
      description: 'Revenir au role picker sans fermer la session.',
      shortcut: 'Role',
      onSelect: handleChangeProfile,
    },
    {
      label: 'Retour accueil',
      description: 'Quitter l interface metier et revenir a la home.',
      shortcut: 'Home',
      onSelect: () => navigate('/'),
    },
  ];

  return (
    <>
      <DashboardShell
        badge={role.shortLabel}
        title={role.dashboardTitle}
        subtitle={screen.subtitle}
        session={session}
        onHome={() => navigate('/')}
        onLogout={handleLogout}
        actionSlot={
          <>
            <CommandButton onClick={() => setIsPaletteOpen(true)} />
            <button
              type="button"
              onClick={handleChangeProfile}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white/82 transition-all hover:-translate-y-0.5 hover:border-[#F36F21]/35 hover:text-white"
            >
              <BadgeCheck className="h-4 w-4 text-[#FFBC82]" />
              <span>Changer de profil</span>
            </button>
          </>
        }
      >
        <div className="mx-auto max-w-[1500px] space-y-6">
          <SectionIntro
            badge={`Role ${role.shortLabel}`}
            title={`${role.title} en mode control room`}
            description={`L interface ${role.shortLabel.toLowerCase()} se concentre sur les decisions critiques, les actions rapides et les points de friction qui coutent du temps ou de la marge.`}
            aside={
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {screen.heroMetrics.map((metric) => (
                  <MetricTile key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
                ))}
              </div>
            }
          />

          <div className="grid gap-4 lg:grid-cols-4">
            {screen.stats.map((stat) => (
              <MetricTile key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
            ))}
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <SegmentedPills
              options={screen.focusModes}
              value={focusMode}
              onChange={setFocusMode}
              layoutId={`focus-${role.key}`}
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/42">
              Focus courant: {focusMode}
            </p>
          </div>

          <Suspense fallback={<div className="flex-1 flex items-center justify-center p-12 text-white/50"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#F36F21]"></div></div>}>
            <BoardComponent focusMode={focusMode} />
          </Suspense>
        </div>
      </DashboardShell>

      <CommandPalette
        open={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        items={paletteItems}
        title={`Pilotage ${role.shortLabel}`}
      />
    </>
  );
}
