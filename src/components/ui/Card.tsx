import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(15,23,42,.06)] dark:border-slate-800 dark:bg-slate-900', className)} {...props} />;
}
