import React from 'react';

export default function SidebarButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active
          ? 'bg-[#F36F21] text-white font-bold shadow-[0_0_20px_rgba(243,111,33,0.3)]'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      {Icon && <Icon className="h-5 w-5" />}
      <span className="text-sm">{label}</span>
    </button>
  );
}
