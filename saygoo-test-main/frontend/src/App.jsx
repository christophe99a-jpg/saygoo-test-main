import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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

function AppLayout() {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  
  // New state to govern the onboarding step
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      setShowAuth(false);
      
      if (payload.mode === 'signup') {
        setShowOnboarding(true);
      } else {
        const targetRole = result?.role || payload.role;
        navigate(getDashboardPath(targetRole));
      }
    } catch (err) {
      console.error('[App] Erreur auth :', err.message);
      alert(err.message || 'Erreur lors de l\'authentification');
    }
  };

  const handleOnboardingComplete = (data) => {
    setShowOnboarding(false);
    // Ideally we would spread `data` into user profile. For now, navigate.
    navigate(getDashboardPath(session.role));
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

          <Route path="*" element={<Navigate to="/" replace />} />
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
