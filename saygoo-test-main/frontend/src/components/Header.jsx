import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ onConnectClick, logo }) => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredPath, setHoveredPath] = useState(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navLinks = [
    { name: 'Accueil', path: '/' },
    { name: 'Solutions', path: '/solutions', premium: true },
    { name: 'Transport', path: '/transport' },
    { name: 'Secteurs', path: '/secteurs' },
    { name: 'Ressources', path: '/ressources' },
    { name: 'À propos', path: '/a-propos' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-[100] transition-all duration-500 h-20
      ${isScrolled ? 'bg-[#1A110B]/95 backdrop-blur-md shadow-2xl' : 'bg-transparent'}
      border-b border-white/10`}
      onMouseLeave={() => setHoveredPath(null)}
    >
      <div className="max-w-[1500px] mx-auto h-full flex justify-between items-center px-4 relative">
        <Link to="/" className="relative z-[110] flex-shrink-0 min-w-[120px] outline-none">
          <img src={logo} alt="SAYGOO" className="w-24 md:w-28 lg:w-32 h-auto object-contain" />
        </Link>

        <div className="hidden lg:flex h-full items-center gap-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const isHovered = hoveredPath === link.path;

            return (
              <div
                key={link.path}
                onMouseEnter={() => setHoveredPath(link.path)}
                className="relative h-20 flex items-center justify-center"
              >
                <Link
                  to={link.path}
                  className={`relative h-20 px-2 xl:px-3 flex items-center justify-center transition-all ${link.premium ? 'text-[#F36F21]' : ''}`}
                >
                  <AnimatePresence>
                    {(isHovered || isActive) && (
                      <motion.div
                        layoutId="navIndicator"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scaleX: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`absolute bottom-6 left-2 right-2 h-[2px] z-0 ${isActive ? 'bg-[#F36F21]' : 'bg-white/50'}`}
                      />
                    )}
                  </AnimatePresence>

                  <span className={`relative z-10 text-[9px] xl:text-[10px] font-black uppercase tracking-widest transition-colors
                      ${isActive ? 'text-[#F36F21]' : isHovered ? 'text-white' : 'text-white/70'}`}
                  >
                    {link.name}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="relative z-[110] flex items-center gap-2">
          <div className="hidden xl:flex items-center gap-3">
            <button onClick={onConnectClick} className="border border-white/40 text-white px-5 py-2.5 rounded-sm text-[9px] font-black uppercase hover:bg-white hover:text-[#2A1A10] transition-colors">
              Démo
            </button>
            <button onClick={onConnectClick} className="bg-[#F36F21] text-white px-5 py-2.5 rounded-sm text-[9px] font-black uppercase hover:bg-white hover:text-[#0F0A06] transition-colors">
              Plateforme
            </button>
          </div>

          <button
            className="lg:hidden w-10 h-10 border border-white/30 rounded-full flex items-center justify-center"
            onClick={() => setIsMobileOpen((prev) => !prev)}
          >
            <span className="text-white text-xl">{isMobileOpen ? '✕' : '='}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="lg:hidden fixed top-0 right-0 w-[80%] h-screen bg-[#1A110B] border-l border-[#F36F21]/40 z-[99] pt-24 shadow-2xl"
          >
            <div className="px-8 py-6 flex flex-col gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`uppercase tracking-[0.2em] text-[12px] font-black ${location.pathname === link.path ? 'text-[#F36F21]' : 'text-white'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="h-[1px] bg-white/10 my-4" />
              <button onClick={onConnectClick} className="bg-[#F36F21] text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Accéder à la Plateforme
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Header;
