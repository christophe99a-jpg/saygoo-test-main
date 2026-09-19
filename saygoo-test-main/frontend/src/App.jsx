import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import './i18n/config';

import Header from './components/Header';
import Footer from './components/Footer';
import AuthPage from './components/AuthPage';
import OnboardingModal from './components/OnboardingModal';
import { AuthProvider, useAuth } from './auth/AuthContextF';
import { ProtectedRoute, PublicOnlyRoute } from './auth/RouteGuards';
import { getDashboardPath } from './auth/roles';

const HomePage = lazy(() => import('./pages/HomePage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateDossier = lazy(() => import('./pages/CreateDossier'));
const SolutionsPage = lazy(() => import('./pages/SolutionsPage'));
const TransportPage = lazy(() => import('./pages/TransportPage'));
const SecteursPage = lazy(() => import('./pages/SecteursPage'));
const RessourcesPage = lazy(() => import('./pages/RessourcesPage'));
const AproposPage = lazy(() => import('./pages/AproposPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const RoleDashboardPage = lazy(() => import('./pages/RoleDashboardPage'));

import logoHeader from './assets/Typo 2.png';

function PageIntrouvable() {
  const { session } = useAuth();
  const cible = session?.role ? getDashboardPath(session.role) : '/';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F36F21]">Erreur 404</p>
      <h1 className="text-2xl font-black text-[#2A1A10]">Cette page n'existe pas</h1>
      <p className="max-w-md text-sm text-gray-500">
        L'adresse demandée est introuvable. Vérifiez le lien ou revenez à votre espace.
      </p>
      <Link
        to={cible}
        className="mt-2 rounded-full bg-[#F36F21] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white"
      >
        {session?.role ? 'Retour à mon espace' : "Retour à l'accueil"}
      </Link>
    </div>
  );
}

function AppLayout() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  // New state to govern the onboarding step
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Message d'information affiché après inscription ou en cas d'erreur d'auth
  const [infoMessage, setInfoMessage] = useState(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { login, session } = useAuth();

  const hideChrome =
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/dossier');

  const handleConnectClick = () => {
    if (session?.role) {
      navigate(getDashboardPath(session.role));
      return;
    }

    setAuthMode('login');
    setShowAuth(true);
  };

  const handleAuthSubmit = async (payload) => {
    try {
      const result = await login(payload);

      // À l'inscription, le back-end crée le compte au statut « en attente de
      // validation » : aucune session n'est ouverte tant qu'un administrateur
      // ne l'a pas activé.
      if (result?.inscriptionReussie) {
        setShowAuth(false);
        setInfoMessage(
          result.message ||
            'Compte créé. Il doit être validé par un administrateur avant la première connexion.'
        );
        return;
      }

      // Compte protégé par double authentification : un code est attendu.
      if (result?.twoFactorRequis) {
        setInfoMessage(result.message || 'Saisissez votre code de double authentification.');
        return;
      }

      setShowAuth(false);
      navigate(getDashboardPath(result.role));
    } catch (err) {
      console.error('[App] Erreur auth :', err.message);
      setInfoMessage(err.message || "Erreur lors de l'authentification");
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (session?.role) navigate(getDashboardPath(session.role));
  };

  const FallbackLoader = () => (
    <div className="flex items-center justify-center min-h-[50vh] bg-transparent">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F36F21]"></div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      {!hideChrome && (
        <Header
          logo={logoHeader}
          onConnectClick={handleConnectClick}
        />
      )}

      <main className="flex-grow">
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <HomePage onConnectClick={handleConnectClick} />
              </PublicOnlyRoute>
            }
          />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/transport" element={<TransportPage />} />
          <Route path="/secteurs" element={<SecteursPage />} />
          <Route path="/ressources" element={<RessourcesPage />} />
          <Route path="/a-propos" element={<AproposPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute allowedRoles={['ROLE_CLIENT']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/cda"
            element={
              <ProtectedRoute allowedRoles={['ROLE_CDA']}>
                <RoleDashboardPage roleKey="ROLE_CDA" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/consignateur"
            element={
              <ProtectedRoute allowedRoles={['ROLE_CONSIGNATEUR']}>
                <RoleDashboardPage roleKey="ROLE_CONSIGNATEUR" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/entrepot"
            element={
              <ProtectedRoute allowedRoles={['ROLE_ENTREPOSEUR']}>
                <RoleDashboardPage roleKey="ROLE_ENTREPOSEUR" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/transporteur"
            element={
              <ProtectedRoute allowedRoles={['ROLE_TRANSPORTEUR']}>
                <RoleDashboardPage roleKey="ROLE_TRANSPORTEUR" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dossier/nouveau"
            element={
              <ProtectedRoute allowedRoles={['ROLE_CLIENT']}>
                <CreateDossier />
              </ProtectedRoute>
            }
          />

          {/* Une URL inconnue affiche une page dédiée : rediriger vers « / »
              provoquait une boucle avec PublicOnlyRoute quand l'utilisateur
              était connecté. */}
          <Route path="*" element={<PageIntrouvable />} />
          </Routes>
        </Suspense>
      </main>

      {!hideChrome && <Footer logo={logoHeader} />}

      {showAuth && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#2A1A10]/90 backdrop-blur-sm transition-opacity"
            onClick={() => setShowAuth(false)}
          />

          <div className="relative z-[210] w-full max-w-[1000px] transform transition-all scale-100">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute -top-12 right-0 text-white text-sm uppercase font-black tracking-widest hover:text-[#F36F21] transition-colors"
            >
              Fermer ✖
            </button>

            <AuthPage initialMode={authMode} onSubmit={handleAuthSubmit} />
          </div>
        </div>
      )}

      {infoMessage && (
        <div className="fixed inset-x-0 bottom-6 z-[60] mx-auto w-[92%] max-w-md rounded-xl border border-[#F36F21]/40 bg-[#1B1B1B] px-5 py-4 shadow-2xl">
          <p className="text-sm font-semibold text-white">{infoMessage}</p>
          <button
            type="button"
            onClick={() => setInfoMessage(null)}
            className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#F36F21]"
          >
            Fermer
          </button>
        </div>
      )}

      {showOnboarding && session?.role && (
        <OnboardingModal 
          roleKey={session.role} 
          onComplete={handleOnboardingComplete} 
        />
      )}
    </div>
  );
}

function DashboardRedirect() {
  const { session } = useAuth();
  const location = useLocation();

  if (!session?.role) {
    return <Navigate to="/" replace />;
  }

  const targetPath = getDashboardPath(session.role);
  
  if (location.pathname === targetPath) {
    return null;
  }

  return <Navigate to={targetPath} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;