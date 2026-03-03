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
    primary: "bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]",
    secondary: "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-90 active:scale-95 border border-[var(--border)]",
    accent: "bg-[var(--accent)] text-black hover:opacity-90 active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.2)]",
    outline: "bg-transparent border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--text-secondary)] active:scale-95",
    ghost: "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95"
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
  <div className={`bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--border)] rounded-[2rem] ${noPadding ? '' : 'p-8 md:p-10'} ${className}`}>
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
    <span className={`px-4 py-1.5 text-[10px] uppercase font-semibold tracking-widest rounded-full bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)] flex-shrink-0 ${className}`}>
      {children}
    </span>
  );
};

export const SectionTitle: React.FC<{ children: React.ReactNode; mono?: boolean }> = ({ children, mono = false }) => (
  <h3 className={`text-[10px] uppercase text-[var(--text-secondary)] tracking-[0.25em] font-semibold mb-6`}>
    {children}
  </h3>
);
