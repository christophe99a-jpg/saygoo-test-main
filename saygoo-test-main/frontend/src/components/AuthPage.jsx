import React, { useEffect, useState } from 'react';
import { ROLE_DEFINITIONS } from '../auth/roles';

const AuthPage = ({ initialMode = 'login', onSubmit }) => {
  const [isSignup, setIsSignup] = useState(initialMode === 'signup');
  const [selectedRole, setSelectedRole] = useState('ROLE_CLIENT');

  // Signup State
  const [signupData, setSignupData] = useState({
    companyName: '',
    email: '',
    password: '',
  });

  // Login State
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    setIsSignup(initialMode === 'signup');
  }, [initialMode]);

  const handleSignup = () => {
    onSubmit?.({
      mode: 'signup',
      fullName: signupData.companyName,
      companyName: signupData.companyName,
      email: signupData.email,
      password: signupData.password,
      role: selectedRole,
    });
  };

  const handleLogin = () => {
    onSubmit?.({
      mode: 'login',
      fullName: loginData.email || 'Utilisateur SAYGOO',
      companyName: 'Organisation SAYGOO',
      email: loginData.email,
      password: loginData.password,
      role: selectedRole,
    });
  };

  return (
    <div className="flex items-center justify-center font-sans">
      <div className="relative overflow-hidden bg-white rounded-[50px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] w-[1000px] max-w-full min-h-[650px] flex">
        
        {/* SIGNUP SECTION */}
        <div className={`absolute top-0 right-0 w-1/2 h-full flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out z-10 ${isSignup ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
          <h2 className="text-4xl font-extrabold text-saygoo-orange mb-2 italic uppercase tracking-tighter">SAYGOO</h2>
          <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-widest">Créer un compte</h3>
          
          <div className="w-full mb-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Sélectionnez votre profil :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {ROLE_DEFINITIONS.map(role => (
                <button
                  key={role.key}
                  onClick={() => setSelectedRole(role.key)}
                  className={`px-3 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all border ${
                    selectedRole === role.key 
                      ? 'bg-saygoo-orange text-white border-saygoo-orange shadow-md' 
                      : 'bg-white text-gray-400 border-gray-200 hover:border-saygoo-orange hover:text-saygoo-orange'
                  }`}
                >
                  {role.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full space-y-4">
            <input
              type="text"
              placeholder="Nom de l'entreprise"
              value={signupData.companyName}
              onChange={(event) => setSignupData((prev) => ({ ...prev, companyName: event.target.value }))}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-saygoo-brown transition-all text-sm font-medium"
            />
            <input
              type="email"
              placeholder="Email professionnel"
              value={signupData.email}
              onChange={(event) => setSignupData((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-saygoo-brown transition-all text-sm font-medium"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={signupData.password}
              onChange={(event) => setSignupData((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-saygoo-brown transition-all text-sm font-medium"
            />
          </div>
          <button
            onClick={handleSignup}
            className="mt-6 bg-saygoo-orange text-white px-14 py-4 rounded-full font-black shadow-lg hover:scale-105 transition-all uppercase tracking-widest text-xs"
          >
            S'inscrire
          </button>
        </div>

        {/* LOGIN SECTION */}
        <div className={`w-1/2 flex flex-col items-center justify-center p-12 transition-all duration-700 ease-in-out ${isSignup ? 'opacity-0 -translate-x-full' : 'opacity-100 translate-x-0'}`}>
          <h2 className="text-4xl font-extrabold text-saygoo-brown mb-2 italic uppercase tracking-tighter">SAYGOO</h2>
          <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-widest">Connexion</h3>
          
          <div className="w-full mb-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Espace de connexion :</p>
            <div className="flex flex-wrap justify-center gap-2">
              {ROLE_DEFINITIONS.map(role => (
                <button
                  key={role.key}
                  onClick={() => setSelectedRole(role.key)}
                  className={`px-3 py-2 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all border ${
                    selectedRole === role.key 
                      ? 'bg-saygoo-brown text-white border-saygoo-brown shadow-md' 
                      : 'bg-white text-gray-400 border-gray-200 hover:border-saygoo-brown hover:text-saygoo-brown'
                  }`}
                >
                  {role.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full space-y-4">
            <input
              type="email"
              placeholder="Email professionnel"
              value={loginData.email}
              onChange={(event) => setLoginData((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-saygoo-brown transition-all text-sm font-medium"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={loginData.password}
              onChange={(event) => setLoginData((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-saygoo-brown transition-all text-sm font-medium"
            />
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4 cursor-pointer hover:text-saygoo-orange uppercase tracking-widest">Mot de passe oublié ?</p>
          <button
            onClick={handleLogin}
            className="mt-6 bg-saygoo-brown text-white px-14 py-4 rounded-full font-black shadow-lg hover:scale-105 transition-all uppercase tracking-widest text-xs"
          >
            Se connecter
          </button>
        </div>

        {/* OVERLAY SECTION */}
        <div
          className={`absolute top-0 left-1/2 w-1/2 h-full transition-all duration-700 ease-in-out z-20 flex flex-col items-center justify-center text-white p-12 text-center
          ${isSignup
            ? '-translate-x-full bg-saygoo-brown rounded-r-[150px]'
            : 'bg-saygoo-orange rounded-l-[150px]'}`}
        >
          <div className="transition-all duration-500">
            <h1 className="text-3xl font-black mb-6 leading-tight uppercase tracking-tighter">
              {isSignup ? 'Ravi de vous revoir !' : 'Nouveau sur SAYGOO ?'}
            </h1>
            <p className="text-sm mb-10 opacity-90 font-bold italic">
              {isSignup
                ? 'Connectez-vous pour accéder à votre espace de travail.'
                : 'Rejoignez la plateforme de gestion nouvelle génération.'}
            </p>
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="border-2 border-white px-12 py-3 rounded-full font-black hover:bg-white hover:text-saygoo-brown transition-all cursor-pointer uppercase tracking-widest text-[10px]"
            >
              {isSignup ? 'Se connecter' : 'Créer un compte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
