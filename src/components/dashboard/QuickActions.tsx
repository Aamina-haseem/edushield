import { useNavigate } from 'react-router-dom';
import { BrainCircuit, FileDown, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';

const actions = [
  [BrainCircuit, 'Run prediction', 'Evaluate a student\'s dropout risk', '/predictions'],
  [PlusCircle, 'Create intervention', 'Start a targeted support plan', '/predictions'],
  [FileDown, 'Generate report', 'Export the executive risk summary', '/reports'],
] as const;

export function QuickActions() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="mb-4"><h3 className="text-lg font-bold">Quick actions</h3><p className="text-sm text-slate-500 dark:text-slate-400">Common advisor workflows</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map(([Icon, title, description, to], index) => (
          <motion.button
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -3 }}
            className="text-left"
            onClick={() => navigate(to)}
          >
            <Card className="h-full p-5 transition hover:border-[#ADDFF1]">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#ADDFF1]/45 text-[#003152]"><Icon size={21} /></span>
              <p className="mt-4 font-bold">{title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </Card>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
