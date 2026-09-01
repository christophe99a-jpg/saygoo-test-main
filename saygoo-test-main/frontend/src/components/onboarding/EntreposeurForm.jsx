import React from 'react';
import { Warehouse, MapPin, Mail, Phone, Maximize, Box } from 'lucide-react';

export default function EntreposeurForm({ handleChange }) {
  return (
    <div className="space-y-6">
      {/* Niveau 1 : Création (Identité & Contact) */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-[#2A1A10] uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-gray-700" />
          Identité & Contact
        </h3>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Warehouse className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="nomEntrepot" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Nom de l'entrepôt / MAD" />
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MapPin className="h-4 w-4 text-gray-400" />
          </div>
          <input required type="text" name="localisation" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Localisation (Port / Ville)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="email" name="email" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Email professionnel" />
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
            <input required type="tel" name="telOTP" onChange={handleChange} className="w-full pl-11 p-4 bg-gray-50 border border-transparent rounded-2xl outline-none focus:border-gray-400 focus:bg-white focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Téléphone OTP" />
          </div>
        </div>
      </div>

      {/* Niveau 2 : Vérification Métier */}
      <div className="space-y-4 pt-2">
        <div className="bg-gray-100/50 rounded-2xl p-5 border border-gray-200">
          <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Box className="w-5 h-5" />
            Capacités Logistiques
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Maximize className="h-4 w-4 text-gray-500" />
              </div>
              <input required type="text" name="capacite" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Capacité (m² ou TEU)" />
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Box className="h-4 w-4 text-gray-500" />
              </div>
              <input required type="text" name="typeMarchandise" onChange={handleChange} className="w-full pl-11 p-4 bg-white border border-gray-100 rounded-xl outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200 transition-all text-sm font-medium" placeholder="Marchandise acceptée" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
