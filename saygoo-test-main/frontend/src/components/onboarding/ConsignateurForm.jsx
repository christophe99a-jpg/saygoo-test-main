import React from 'react';
import { Building2, User, Mail, Phone, ShieldCheck, Anchor } from 'lucide-react';

export default function ConsignateurForm({ handleChange }) {
  return (
    <div className="space-y-6">
      {/* Niveau 1 : Création (Contact & Identité) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#3C9AB7]" />
          Identité & Contact
        </h3>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Building2 className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="nomStructure" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#3C9AB7]/30 focus:bg-white focus:ring-4 focus:ring-[#3C9AB7]/10 transition-all text-sm font-medium" placeholder="Nom de la structure (Agence)" />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="contactPrincipal" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#3C9AB7]/30 focus:bg-white focus:ring-4 focus:ring-[#3C9AB7]/10 transition-all text-sm font-medium" placeholder="Contact principal" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="email" name="email" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#3C9AB7]/30 focus:bg-white focus:ring-4 focus:ring-[#3C9AB7]/10 transition-all text-sm font-medium" placeholder="Email professionnel" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="tel" name="telOTP" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#3C9AB7]/30 focus:bg-white focus:ring-4 focus:ring-[#3C9AB7]/10 transition-all text-sm font-medium" placeholder="Téléphone OTP" />
          </div>
        </div>
      </div>

      {/* Niveau 2 : Vérification Métier */}
      <div className="space-y-4 pt-2">
        <div className="bg-[#3C9AB7]/5 rounded-2xl p-5 border border-[#3C9AB7]/20">
          <h3 className="text-sm font-black text-[#3C9AB7] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Vérification Métier
          </h3>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Anchor className="h-4 w-4 text-[#3C9AB7]/60" />
              </div>
              <input required type="text" name="armateurs" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#3C9AB7]/30 focus:ring-4 focus:ring-[#3C9AB7]/10 transition-all text-sm font-medium" placeholder="Armateurs représentés (Ex: MSC, Maersk...)" />
              <p className="text-[10px] text-gray-500 mt-2 px-1">Fait office de preuve de représentation (Mandat).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
