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
    <section className="relative overflow-hidden rounded-[32px] bg-[#003152] p-6 text-white shadow-[0_30px_80px_rgba(0,49,82,.24)] sm:p-8 lg:p-10">
      <div className="absolute -right-28 -top-28 size-80 rounded-full bg-[#ADDFF1]/20 blur-3xl" /><div className="absolute bottom-0 right-1/3 size-40 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="relative grid gap-10 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-sky-100"><Sparkles size={14} />Intelligence brief</div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl xl:text-5xl">
            {greeting}, {firstName}. {highRiskCount > 0 ? <><span className="text-[#ADDFF1]">{highRiskCount} student{highRiskCount === 1 ? '' : 's'}</span> require immediate review today.</> : 'No students currently require immediate review.'}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sky-100/75 sm:text-base">EduShield combines academic, attendance and behavioural indicators to prioritize the cases most likely to benefit from early intervention.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button icon={<ShieldCheck size={18} />} onClick={() => navigate('/students?risk=HIGH')}>Review high-risk students</Button>
            <Button variant="secondary" icon={<Play size={17} />} onClick={() => navigate('/predictions')}>Run new prediction</Button>
          </div>
          <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-4"><p className="truncate text-xl font-bold">{value}</p><p className="mt-1 text-xs text-sky-100/60">{label}</p></div>)}
          </div>
        </div>
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .6 }} className="mx-auto grid size-64 place-items-center rounded-full border border-white/15 bg-white/5 p-7 shadow-[inset_0_0_80px_rgba(173,223,241,.12)]">
          <div className="grid size-full place-items-center rounded-full border-[14px] border-white/10 border-t-[#ADDFF1] bg-[#082a44] shadow-2xl"><div className="text-center"><BrainCircuit className="mx-auto text-[#ADDFF1]" size={44} /><p className="mt-2 text-3xl font-bold">{accuracyPct}%</p><p className="text-xs text-sky-100/60">model confidence</p></div></div>
        </motion.div>
      </div>
    </section>
  );
}
