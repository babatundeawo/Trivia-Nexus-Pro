import React from 'react';
import { audioEngine } from '../services/audio';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  glow = false, 
  className = '', 
  onClick,
  ...props 
}) => {
  const base = "px-4 py-3 lg:px-6 lg:py-4 rounded-xl lg:rounded-2xl font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-xs lg:text-sm";
  
  const variants = {
    primary: "bg-[#00f2ff] text-black shadow-lg shadow-cyan-500/10 hover:shadow-cyan-400/30",
    secondary: "bg-[#7000ff] text-white shadow-lg shadow-purple-500/10 hover:shadow-purple-400/30",
    accent: "bg-[#ff00c8] text-white shadow-lg shadow-pink-500/10 hover:shadow-pink-400/30",
    outline: "bg-transparent border-2 border-[#00f2ff] text-[#00f2ff] hover:bg-[#00f2ff]/5",
    ghost: "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    audioEngine.playClick();
    if (onClick) onClick(e);
  };

  return (
    <button 
      className={`${base} ${variants[variant]} ${glow ? 'active-pulse' : ''} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ 
  children, 
  className = '', 
  noPadding = false 
}) => (
  <div className={`glass rounded-2xl lg:rounded-[2.5rem] border border-white/5 ${noPadding ? '' : 'p-5 lg:p-8'} ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ 
  children: React.ReactNode; 
  color?: 'cyan' | 'purple' | 'pink' | 'emerald' | 'rose' | 'slate';
  className?: string;
}> = ({ 
  children, 
  color = 'cyan',
  className = ''
}) => {
  const colors = {
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-400/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-400/20",
    pink: "bg-pink-500/10 text-pink-400 border-pink-400/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-400/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-400/20"
  };

  return (
    <span className={`px-3 py-1 text-[9px] lg:text-[10px] uppercase font-black tracking-widest rounded-lg border flex-shrink-0 ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono = true }) => (
  <h3 className={`${mono ? 'font-mono text-[9px]' : 'text-[10px]'} uppercase text-slate-500 tracking-[0.3em] font-black mb-3`}>
    {children}
  </h3>
);