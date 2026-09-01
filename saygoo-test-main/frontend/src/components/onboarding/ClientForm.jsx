import React from 'react';
import { Building2, Globe, FileText, Hash, User, Mail, Phone, Briefcase, PackageOpen } from 'lucide-react';

export default function ClientForm({ handleChange }) {
  return (
    <div className="space-y-6">
      {/* Niveau 1 : Création (Identité) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#F36F21]" />
          Identité Opérateur
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="raisonSociale" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Raison sociale / Nom complet" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Globe className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="pays" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Pays" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" name="rccm" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Numéro RCCM (si société)" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Hash className="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" name="nif" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Numéro NIF / Identité" />
          </div>
        </div>
      </div>

      {/* Niveau 1 : Création (Contacts) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-[#F36F21]" />
          Contact Sécurisé
        </h3>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="representant" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Nom du représentant / Contact" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="email" name="email" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Email (Vérifié via lien)" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="tel" name="telOTP" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Téléphone (Vérification OTP)" />
          </div>
        </div>
      </div>

      {/* Niveau 2 : Vérification Métier */}
      <div className="space-y-4 pt-2">
        <div className="bg-[#F36F21]/5 rounded-2xl p-5 border border-[#F36F21]/20">
          <h3 className="text-sm font-black text-[#F36F21] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Vérification Opérationnelle
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Briefcase className="h-4 w-4 text-[#F36F21]/60" />
                </div>
                <select required name="typeActivite" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#F36F21]/30 focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium text-gray-700 appearance-none">
                  <option value="" className="text-gray-400">Secteur d'activité...</option>
                  <option value="importateur">Importateur</option>
                  <option value="exportateur">Exportateur</option>
                  <option value="commercant">Commerçant / Distributeur</option>
                  <option value="industriel">Industriel</option>
                </select>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <PackageOpen className="h-4 w-4 text-[#F36F21]/60" />
                </div>
                <input required type="text" name="natureProduits" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#F36F21]/30 focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Nature des produits (ex: Agro, Tech)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mt-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input required type="checkbox" name="acceptTerms" className="mt-1 w-4 h-4 text-[#F36F21] border-gray-300 rounded focus:ring-[#F36F21]" />
          <span className="text-xs text-gray-600 font-medium leading-relaxed">En créant ce compte, je certifie l'exactitude des informations et accepte le <strong className="text-[#F36F21]">KYC Niveau 1</strong> de SAYGOO.</span>
        </label>
      </div>
    </div>
  );
}
