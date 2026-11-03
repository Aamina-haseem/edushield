import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
    <div><p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-[#0E7490] dark:text-[#ADDFF1]">{eyebrow}</p><h1 className="es-title text-3xl font-extrabold tracking-tight sm:text-5xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p></div>{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </motion.header>
}

export function Stat({ label, value, note }: { label: string; value: string; note: string }) { return <Card className="p-5"><p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p><p className="font-display mt-2 text-3xl font-extrabold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{note}</p></Card> }

export function SectionTitle({ title, description }: { title: string; description?: string }) { return <div><h2 className="text-xl font-bold">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}</div> }

export function Pill({ children, tone='slate' }: { children: ReactNode; tone?: 'red'|'amber'|'green'|'blue'|'slate' }) {
  const tones={red:'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',amber:'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',green:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',blue:'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',slate:'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'};
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>
}
