import React, { useState } from 'react';
import { getRoleDefinition } from '../auth/roles';

import TransporteurForm from './onboarding/TransporteurForm';
import ConsignateurForm from './onboarding/ConsignateurForm';
import CdaForm from './onboarding/CdaForm';
import EntreposeurForm from './onboarding/EntreposeurForm';
import ClientForm from './onboarding/ClientForm';

export default function OnboardingModal({ roleKey, onComplete }) {
  const role = getRoleDefinition(roleKey);
  const [formData, setFormData] = useState({});

  if (!roleKey) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#2A1A10]/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg p-8 md:p-10 relative my-8">
        
        {/* Background Accent */}
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${role.accent}`} />
        
        <div className="text-center mb-8">
          <span className={`inline-flex items-center rounded-full px-4 py-2 text-[10px] uppercase font-black tracking-[0.25em] mb-4 ${role.highlight}`}>
            Onboarding {role.shortLabel}
          </span>
          <h2 className="text-3xl font-black uppercase text-[#2A1A10] leading-tight">
            Finaliser votre profil
          </h2>
          <p className="text-sm text-gray-500 mt-2 font-medium">
            Veuillez fournir les informations professionnelles requises pour activer votre espace {role.title}.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {roleKey === 'ROLE_TRANSPORTEUR' && <TransporteurForm handleChange={handleChange} />}
          {roleKey === 'ROLE_CONSIGNATEUR' && <ConsignateurForm handleChange={handleChange} />}
          {roleKey === 'ROLE_CDA' && <CdaForm handleChange={handleChange} />}
          {roleKey === 'ROLE_ENTREPOSEUR' && <EntreposeurForm handleChange={handleChange} />}
          {roleKey === 'ROLE_CLIENT' && <ClientForm handleChange={handleChange} />}

          {/* Document Upload Section */}
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">Documents justificatifs (Optionnel)</label>
            <div className="mt-2 flex justify-center rounded-xl border border-dashed border-gray-300 px-6 py-6 hover:bg-gray-50 transition-colors">
              <div className="text-center">
                <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4 flex text-sm text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-bold text-[#F36F21] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#F36F21] focus-within:ring-offset-2 hover:text-[#ff8d46]">
                    <span>Ajouter des PDF</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf" multiple onChange={(e) => {
                      if (e.target.files.length) {
                        setFormData({ ...formData, documents: e.target.files });
                      }
                    }} />
                  </label>
                  <p className="pl-1">ou glissez-déposez</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">PDF uniquement (Immatriculation, Agrément)</p>
                {formData.documents && (
                  <p className="text-xs font-bold text-[#4CC38A] mt-2">{formData.documents.length} fichier(s) sélectionné(s)</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-[#2A1A10] text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:translate-y-[-2px] transition-all uppercase tracking-widest text-xs"
          >
            Terminer l'onboarding
          </button>
        </form>
      </div>
    </div>
  );
}
