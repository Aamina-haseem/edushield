import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: ReactNode;
}

export function Button({ variant = 'primary', icon, className, children, ...props }: ButtonProps) {
  const variants = {
    primary: 'bg-[#003152] text-white hover:bg-[#0b426b] shadow-[0_12px_30px_rgba(0,49,82,.18)]',
    secondary: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return <button className={cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#ADDFF1] disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...props}>{icon}{children}</button>;
}
