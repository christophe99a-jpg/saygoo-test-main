import React from 'react';
import { Building2, Globe, FileText, Hash, User, Mail, Phone, MapPin, ShieldCheck, Calendar, Landmark } from 'lucide-react';

export default function CdaForm({ handleChange }) {
  return (
    <div className="space-y-6">
      {/* Niveau 1 : Création (Identité Administrative) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#F36F21]" />
          Identité Administrative
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Building2 className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="denomination" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Dénomination sociale" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Globe className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="paysExercice" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Pays d'exercice" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="rccm" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Numéro RCCM" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Hash className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="text" name="nif" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Numéro NIF / IFU" />
          </div>
        </div>
      </div>

      {/* Niveau 1 : Création (Contacts & Localisation) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-[#F36F21]" />
          Contacts & Représentant
        </h3>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="representant" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Nom du représentant légal" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="email" name="emailPro" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Email professionnel" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="tel" name="telPro" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Téléphone professionnel" />
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="adresseSiege" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-[#F36F21]/30 focus:bg-white focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Adresse complète du siège" />
        </div>
      </div>

      {/* Niveau 2 : Vérification Métier */}
      <div className="space-y-4 pt-2">
        <div className="bg-[#F36F21]/5 rounded-2xl p-5 border border-[#F36F21]/20">
          <h3 className="text-sm font-black text-[#F36F21] uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Vérification Métier (Agrément)
          </h3>
          
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <ShieldCheck className="h-4 w-4 text-[#F36F21]/60" />
              </div>
              <input required type="text" name="agrementDouane" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#F36F21]/30 focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Numéro d'agrément douanier" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Landmark className="h-4 w-4 text-[#F36F21]/60" />
                </div>
                <input required type="text" name="autoriteEmettrice" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#F36F21]/30 focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium" placeholder="Autorité émettrice (ex: Douanes)" />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Calendar className="h-4 w-4 text-[#F36F21]/60" />
                </div>
                <input required type="text" name="dateValiditeAgrement" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = e.target.value ? 'date' : 'text'} onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#F36F21]/30 focus:ring-4 focus:ring-[#F36F21]/10 transition-all text-sm font-medium text-gray-500" placeholder="Date de validité" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
