import React from 'react';
import { motion } from 'motion/react';
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
  const base = "px-6 py-4 rounded-2xl font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-3 select-none disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-sm";
  
  const variants = {
    primary: "bg-[#00b4d8] text-white shadow-cyan-500/20",
    secondary: "bg-[#4361ee] text-white shadow-blue-500/20",
    accent: "bg-[#f72585] text-white shadow-pink-500/20",
    outline: "bg-transparent border border-[#00b4d8] text-[#00b4d8] hover:bg-[#00b4d8]/5",
    ghost: "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    audioEngine.playClick();
    if (onClick) onClick(e);
  };

  return (
    <motion.button 
      whileTap={{ scale: 0.96 }}
      className={`${base} ${variants[variant]} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ 
  children, 
  className = '', 
  noPadding = false 
}) => (
  <div className={`glass rounded-3xl border border-slate-200 ${noPadding ? '' : 'p-6 md:p-8'} ${className}`}>
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
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    pink: "bg-pink-50 text-pink-700 border-pink-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200"
  };

  return (
    <span className={`px-3 py-1 text-[10px] uppercase font-bold tracking-widest rounded-full border flex-shrink-0 ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono = true }) => (
  <h3 className={`${mono ? 'font-mono text-[10px]' : 'text-[11px]'} uppercase text-slate-500 tracking-[0.2em] font-bold mb-4`}>
    {children}
  </h3>
);
