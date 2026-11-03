import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BrainCircuit, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface HeroProps {
  firstName: string;
  highRiskCount: number;
  totalStudents: number;
  activeInterventions: number;
  accuracyPct: number;
  modelVersion: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Hero({ firstName, highRiskCount, totalStudents, activeInterventions, accuracyPct, modelVersion }: HeroProps) {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const stats: [string, string][] = [
    [`${accuracyPct}%`, 'Accuracy'],
    [totalStudents.toLocaleString(), 'Monitored'],
    [String(activeInterventions), 'Active plans'],
    [modelVersion, 'Model version'],
  ];

  return (
    <section className="es-stage relative overflow-hidden rounded-[32px] border border-[#ADDFF1]/10 p-6 text-white shadow-[0_30px_80px_rgba(0,49,82,.28)] sm:p-8 lg:p-10">
      <div className="es-curtain" aria-hidden="true" />
      <div className="relative grid gap-10 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100 backdrop-blur"><Sparkles size={14} />Intelligence brief</div>
          <h2 className="mt-5 max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl xl:text-[3.4rem]">
            <span className="es-gradient-text">{greeting}, {firstName}.</span>{' '}
            {highRiskCount > 0 ? <><span className="text-[#ADDFF1]">{highRiskCount} student{highRiskCount === 1 ? '' : 's'}</span> <span className="font-semibold text-white/90">require immediate review today.</span></> : <span className="font-semibold text-white/90">No students currently require immediate review.</span>}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/75 sm:text-base">EduShield combines academic, attendance and behavioural indicators to prioritize the cases most likely to benefit from early intervention.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button className="bg-[linear-gradient(135deg,#ADDFF1,#2cc4d6)] text-[#003152] shadow-[0_12px_36px_rgba(44,196,214,.35)]" icon={<ShieldCheck size={18} />} onClick={() => navigate('/students?risk=HIGH')}>Review high-risk students</Button>
            <Button variant="secondary" className="border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20" icon={<Play size={17} />} onClick={() => navigate('/predictions')}>Run new prediction</Button>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03))] p-4 backdrop-blur"><p className="font-display truncate text-xl font-bold">{value}</p><p className="mt-1 text-xs text-sky-100/60">{label}</p></div>)}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6 }} className="mx-auto grid size-64 place-items-center rounded-full border border-white/15 bg-white/5 p-7 shadow-[inset_0_0_80px_rgba(173,223,241,.14),0_0_60px_rgba(44,196,214,.18)]">
          <div className="grid size-full place-items-center rounded-full border-[14px] border-white/10 border-t-[#ADDFF1] border-r-[#2cc4d6] bg-[#03182b] shadow-2xl"><div className="text-center"><BrainCircuit className="mx-auto text-[#ADDFF1]" size={44} /><p className="font-display es-gradient-text mt-2 text-4xl font-extrabold">{accuracyPct}%</p><p className="text-xs text-sky-100/60">model accuracy</p></div></div>
        </motion.div>
      </div>
    </section>
  );
}
