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
  const base = "px-8 py-5 rounded-full font-medium tracking-tight transition-all duration-300 flex items-center justify-center gap-3 select-none disabled:opacity-30 disabled:cursor-not-allowed text-sm";
  
  const variants = {
    primary: "bg-white text-black hover:bg-neutral-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    secondary: "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-95 border border-white/5",
    accent: "bg-cyan-500 text-black hover:bg-cyan-400 active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.2)]",
    outline: "bg-transparent border border-white/10 text-white hover:border-white/40 active:scale-95",
    ghost: "bg-transparent text-neutral-500 hover:text-white active:scale-95"
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    audioEngine.playClick();
    if (onClick) onClick(e);
  };

  return (
    <motion.button 
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
  <div className={`bg-neutral-900/50 backdrop-blur-xl border border-white/5 rounded-[2rem] ${noPadding ? '' : 'p-8 md:p-10'} ${className}`}>
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
  return (
    <span className={`px-4 py-1.5 text-[10px] uppercase font-semibold tracking-widest rounded-full bg-white/5 text-neutral-400 border border-white/5 flex-shrink-0 ${className}`}>
      {children}
    </span>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono = false }) => (
  <h3 className={`text-[10px] uppercase text-neutral-400 tracking-[0.25em] font-semibold mb-6`}>
    {children}
  </h3>
);
