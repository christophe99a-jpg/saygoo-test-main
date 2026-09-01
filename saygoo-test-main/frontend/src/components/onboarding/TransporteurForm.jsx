import React from 'react';
import { Truck, MapPin, Mail, Phone, ShieldCheck, FileText, Hash, BadgeCheck } from 'lucide-react';

export default function TransporteurForm({ handleChange }) {
  return (
    <div className="space-y-6">
      {/* Niveau 1 : Création (Identité & Contact) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#4CC38A]" />
          Identité & Zone
        </h3>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Truck className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="raisonSociale" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#4CC38A]/30 focus:bg-white focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="Raison sociale / Nom complet" />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="zoneActivite" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#4CC38A]/30 focus:bg-white focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="Zone d'activité (Pays / Région)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="email" name="email" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#4CC38A]/30 focus:bg-white focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="Email de contact" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="tel" name="telOTP" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#4CC38A]/30 focus:bg-white focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="Téléphone OTP" />
          </div>
        </div>
      </div>

      {/* Niveau 2 : Vérification Métier */}
      <div className="space-y-4 pt-2">
        <div className="bg-[#4CC38A]/5 rounded-2xl p-5 border border-[#4CC38A]/20">
          <h3 className="text-sm font-black text-[#4CC38A] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Vérification Métier
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-[#4CC38A]/60" />
                </div>
                <input required type="text" name="rccm" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#4CC38A]/30 focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="RCCM / ID National" />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Hash className="h-4 w-4 text-[#4CC38A]/60" />
                </div>
                <input required type="text" name="nif" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#4CC38A]/30 focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="NIF / Permis adapté" />
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <BadgeCheck className="h-4 w-4 text-[#4CC38A]/60" />
              </div>
              <input required type="text" name="licence" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#4CC38A]/30 focus:ring-4 focus:ring-[#4CC38A]/10 transition-all text-sm font-medium" placeholder="Licence transport / Autorisation" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
