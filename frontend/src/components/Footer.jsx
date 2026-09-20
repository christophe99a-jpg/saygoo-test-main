import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaInstagram, FaYoutube, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaPaperPlane } from 'react-icons/fa';

const Footer = ({ logo }) => {
  return (
    <footer className="bg-[#1A110B] text-white pt-20 pb-6 font-sans relative overflow-hidden">
      <div className="max-w-[1500px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        
        {/* 1. COLONNE LOGO & CONTACT */}
        <div className="flex flex-col">
          <div className="bg-[#F36F21] p-4 inline-block mb-8 w-fit">
             <img src={logo} alt="SAYGOO" className="h-10 brightness-0 invert" />
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F36F21] group-hover:bg-[#F36F21] group-hover:text-white transition-all">
                <FaMapMarkerAlt size={14} />
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Lomé, Togo <br /> Quartier des Affaires
              </p>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F36F21] group-hover:bg-[#F36F21] group-hover:text-white transition-all">
                <FaPhoneAlt size={14} />
              </div>
              <div className="text-gray-400 text-sm italic">
                <p>+228 00 00 00 00</p>
                <p>+228 99 99 99 99</p>
              </div>
            </div>

            <div className="flex items-start gap-4 group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-[#F36F21] group-hover:bg-[#F36F21] group-hover:text-white transition-all">
                <FaEnvelope size={14} />
              </div>
              <div className="text-gray-400 text-sm italic">
                <p>info@saygoo.com</p>
                <p>support@saygoo.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. COLONNE LIENS RAPIDES */}
        <div>
          <h4 className="text-xl font-bold mb-2 uppercase tracking-wider">Liens Utiles</h4>
          <div className="w-12 h-1 bg-[#F36F21] mb-8"></div>
          <ul className="space-y-4 text-gray-400 text-sm">
            <li><Link to="/" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> Accueil</Link></li>
            <li><Link to="/solutions" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> Nos Solutions</Link></li>
            <li><Link to="/transport" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> Transport</Link></li>
            <li><Link to="/secteurs" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> Secteurs</Link></li>
            <li><Link to="/a-propos" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> À propos</Link></li>
            <li><Link to="/ressources" className="hover:text-[#F36F21] transition-all duration-300 flex items-center gap-2"><span>›</span> Ressources</Link></li>
          </ul>
        </div>

        {/* 3. COLONNE DERNIERS SERVICES (ou Posts) */}
        <div>
          <h4 className="text-xl font-bold mb-2 uppercase tracking-wider">Expertise</h4>
          <div className="w-12 h-1 bg-[#F36F21] mb-8"></div>
          <div className="space-y-6">
            <div className="group cursor-pointer">
              <p className="text-gray-300 text-sm group-hover:text-[#F36F21] transition-colors">Optimisation de la liasse documentaire pour le transit.</p>
              <span className="text-[#F36F21] text-[10px] font-bold">FEVRIER 2026</span>
            </div>
            <div className="group cursor-pointer border-t border-white/5 pt-4">
              <p className="text-gray-300 text-sm group-hover:text-[#F36F21] transition-colors">SGO SAS : Nouveau corridor logistique Afrique de l'Ouest.</p>
              <span className="text-[#F36F21] text-[10px] font-bold">JANVIER 2026</span>
            </div>
          </div>
        </div>

        {/* 4. COLONNE NEWSLETTER & RESEAUX */}
        <div>
          <h4 className="text-xl font-bold mb-2 uppercase tracking-wider">Newsletter</h4>
          <div className="w-12 h-1 bg-[#F36F21] mb-8"></div>
          
          <div className="relative mb-8">
            <input 
              type="email" 
              placeholder="Votre Email..." 
              className="w-full bg-white py-4 px-6 text-[#1A110B] outline-none text-sm italic rounded-none border-none"
            />
            <button className="absolute right-0 top-0 bottom-0 bg-[#F36F21] px-5 flex items-center justify-center text-white hover:bg-white hover:text-[#F36F21] transition-all border-l border-white">
              <FaPaperPlane size={18} />
            </button>
          </div>

          <div className="flex gap-3">
            {[FaFacebookF, FaTwitter, FaInstagram, FaYoutube].map((Icon, idx) => (
              <a key={idx} href="#" className="w-10 h-10 bg-white/5 flex items-center justify-center text-white hover:bg-[#F36F21] transition-all rounded-sm">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* COPYRIGHT BOTTOM */}
      <div className="border-t border-white/5 mt-20 py-8 bg-[#150D08]">
        <div className="max-w-[1500px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
          <p>Copyright © Saygoo 2026. SGO SAS - Tous droits réservés.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Mentions Légales</a>
            <a href="#" className="hover:text-white">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;