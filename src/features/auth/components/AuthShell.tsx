import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { BrainCircuit, CircleCheck, Layers, LockKeyhole, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { Curtain } from '@/features/auth/components/Curtain';
import graduationCapPhoto from '@/features/auth/components/photos/graduation_cap_cutout.png';
// AI-generated portrait of a fictional student (Bloom, GPT Image), made for this login page.
import studentPortrait from '@/features/auth/components/photos/edushield_student.webp';

/**
 * "Orbit" layout (wide screens): the student stands in the centre of the stage and the system's
 * capabilities float around her as glass chips, each pinned to her by a thin line — an explanation
 * diagram, echoing what EduShield does for every student. Positions are percentages of the stage:
 * `box` is the chip's top-left corner, `from` its centre and `to` the pin on the portrait.
 */
const orbit = [
  { icon: BrainCircuit, title: 'Risk score 0–100', text: 'High, Medium and Low tiers', box: [60, 0], from: [71, 5], to: [50, 29] },
  { icon: Sparkles, title: 'Explained with SHAP', text: 'every score, factor by factor', box: [70, 12], from: [81, 17], to: [59, 40] },
  { icon: Layers, title: '22 factors', text: 'weighed for every student', box: [4, 51], from: [15, 57], to: [37.5, 49], big: true },
  { icon: ShieldCheck, title: 'Support tracked', text: 'from plan to completion', box: [10, 77], from: [21, 82], to: [40, 66] },
  { icon: UsersRound, title: 'Staff and student views', text: 'each one access-controlled', box: [42, 87], from: [53, 92], to: [48.5, 84] },
] as const;

/** Dust in the spotlight beam: repeatable pseudo-random positions so every render matches. */
const motes = Array.from({ length: 22 }, (_, i) => {
  const r = (k: number) => { const s = Math.sin(i * 91.7 + k * 12.9898) * 43758.5453; return s - Math.floor(s); };
  return { x: 30 + 34 * r(1), y: 18 + 76 * r(2), size: 1 + 1.6 * r(3), opacity: 0.25 + 0.45 * r(4), dx: -24 + 48 * r(5), duration: 7 + 7 * r(6), delay: 6 * r(7) };
});

const EASE = [0.22, 1, 0.36, 1] as const;
const OPENING_KEY = 'edushield-curtain-opened';

/** Moves focus to the first field of the sign-in card (and scrolls to it on small screens). */
function focusCard() {
  const card = document.getElementById('signin-card');
  card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
}

interface ChipProps {
  item: (typeof orbit)[number];
  index: number;
  delay: number;
  animated: boolean;
  highlighted: boolean;
  onHover: (index: number | null) => void;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

function OrbitChip({ item, index, delay, animated, highlighted, onHover, x, y }: ChipProps) {
  const Icon = item.icon;
  const position = { '--x': `${item.box[0]}%`, '--y': `${item.box[1]}%`, x, y } as unknown as CSSProperties;
  return (
    <motion.div
      style={position}
      className="z-20 xl:absolute xl:left-[var(--x)] xl:top-[var(--y)] xl:w-[250px]"
      initial={animated ? { opacity: 0, scale: 0.85, filter: 'blur(8px)' } : false}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <motion.div
        className={`es-tile flex items-center gap-3 rounded-2xl px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,.4)] transition-shadow duration-300 ${highlighted ? 'ring-1 ring-[#ADDFF1]/50 shadow-[0_0_34px_rgba(44,196,214,.4)]' : ''}`}
        animate={animated ? { y: [0, -5, 0] } : undefined}
        transition={{ duration: 5 + index * 0.7, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.8 }}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[.07] text-[#ADDFF1]"><Icon size={18} /></span>
        <div className="min-w-0">
          <p className={'big' in item ? 'font-display text-2xl font-bold leading-7' : 'text-sm font-semibold'}>{item.title}</p>
          <p className="text-xs leading-5 text-white/65">{item.text}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Always rendered in the dark "stage" style, whatever theme the app is set to.
export function AuthShell({ children }: { children: ReactNode }) {
  const animated = !useReducedMotion();
  // The curtain opening plays on the first visit of a browser session only.
  const [opening] = useState(() => {
    try { return animated && !sessionStorage.getItem(OPENING_KEY); } catch { return false; }
  });
  const [drapesOpen, setDrapesOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    try { sessionStorage.setItem(OPENING_KEY, '1'); } catch { /* storage unavailable: the opening simply replays */ }
  }, []);

  // When the stage starts revealing itself (after the drapes part, if they play).
  const t0 = opening ? 1.15 : 0.15;
  const enter = (delay: number, y = 24) => (animated
    ? { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay: t0 + delay, duration: 0.8, ease: EASE } }
    : {});

  // Depth parallax: curtain, stage and chips follow the pointer by different amounts.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 60, damping: 20 };
  const curtainX = useSpring(useTransform(px, [-0.5, 0.5], [12, -12]), spring);
  const curtainY = useSpring(useTransform(py, [-0.5, 0.5], [8, -8]), spring);
  const stageX = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), spring);
  const stageY = useSpring(useTransform(py, [-0.5, 0.5], [-5, 5]), spring);
  const chipX = useSpring(useTransform(px, [-0.5, 0.5], [-16, 16]), spring);
  const chipY = useSpring(useTransform(py, [-0.5, 0.5], [-10, 10]), spring);

  function handlePointer(event: MouseEvent<HTMLElement>) {
    if (!animated) return;
    px.set(event.clientX / window.innerWidth - 0.5);
    py.set(event.clientY / window.innerHeight - 0.5);
  }

  const lineOpacity = (i: number) => (hovered === null ? 0.55 : hovered === i ? 1 : 0.18);

  return (
    <main onMouseMove={handlePointer} className="dark relative min-h-screen overflow-hidden bg-[#01060c] p-3 text-white sm:p-6 lg:px-10 lg:py-8">
      <motion.div className="pointer-events-none absolute -inset-6" style={{ x: curtainX, y: curtainY }}>
        <Curtain />
      </motion.div>

      {/* Opening: two velvet drapes swing apart, with a flash of light at the seam. */}
      {opening && !drapesOpen && (
        <div className="pointer-events-none fixed inset-0 z-50" aria-hidden="true">
          <motion.div className="es-drape absolute inset-y-0 left-0 w-[51%] origin-top-left" initial={{ x: 0, skewX: 0 }} animate={{ x: '-104%', skewX: -6 }} transition={{ delay: 0.25, duration: 1.3, ease: [0.7, 0, 0.2, 1] }} onAnimationComplete={() => setDrapesOpen(true)} />
          <motion.div className="es-drape absolute inset-y-0 right-0 w-[51%] origin-top-right" initial={{ x: 0, skewX: 0 }} animate={{ x: '104%', skewX: 6 }} transition={{ delay: 0.25, duration: 1.3, ease: [0.7, 0, 0.2, 1] }} />
          <motion.div className="absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(173,223,241,.45),transparent)]" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 0.15, duration: 1.1 }} />
        </div>
      )}

      <div className="es-panel relative mx-auto flex max-w-7xl flex-col rounded-[28px] px-5 py-5 sm:px-8 lg:px-12 lg:py-7">
        <motion.header className="flex items-center gap-6" {...enter(0, -12)}>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#ADDFF1,#2cc4d6)] shadow-[0_0_24px_rgba(44,196,214,.45)]">
              <img src={graduationCapPhoto} alt="" className="size-full object-cover" />
            </span>
            <p className="font-display text-sm font-bold leading-4">EduShield<br /><span className="font-semibold text-[#ADDFF1]">AI</span></p>
          </div>
          <p className="hidden text-sm font-medium text-white/70 md:block">Predict · Explain · Support · Track</p>
          <div className="ml-auto flex items-center gap-4">
            <span className="hidden items-center gap-2 text-sm text-white/70 sm:flex"><LockKeyhole size={16} />Secure university access</span>
            <button type="button" onClick={focusCard} className="rounded-xl bg-[linear-gradient(135deg,#ADDFF1,#2cc4d6)] px-5 py-2.5 text-sm font-semibold text-[#003152] shadow-[0_10px_30px_rgba(44,196,214,.35)] transition hover:brightness-110">Sign in</button>
          </div>
        </motion.header>

        {/* The stage: stacked on small screens, the orbit composition on wide ones. */}
        <section className="relative mt-6 flex flex-col gap-6 xl:mt-4 xl:block xl:h-[clamp(540px,calc(100vh-200px),660px)]">
          <motion.div className="pointer-events-none absolute inset-0 hidden xl:block" style={{ x: stageX, y: stageY }} aria-hidden="true">
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <motion.ellipse cx="47" cy="52" fill="none" stroke="rgba(173,223,241,.22)" strokeWidth="1" strokeDasharray="3 7" vectorEffect="non-scaling-stroke" className="motion-safe:animate-[es-orbit-drift_40s_linear_infinite]"
                initial={animated ? { rx: 0, ry: 0, opacity: 0 } : false} animate={{ rx: 31, ry: 44, opacity: 1 }} transition={{ delay: t0 + 0.6, duration: 1.2, ease: EASE }} />
              <motion.ellipse cx="47" cy="54" fill="none" stroke="rgba(173,223,241,.1)" strokeWidth="1" vectorEffect="non-scaling-stroke"
                initial={animated ? { rx: 0, ry: 0, opacity: 0 } : false} animate={{ rx: 22, ry: 32, opacity: 1 }} transition={{ delay: t0 + 0.5, duration: 1.2, ease: EASE }} />
              {/* Each line grows from the pin on the student out to its chip. */}
              {orbit.map((item, i) => (
                <motion.line key={item.title} x1={item.to[0]} y1={item.to[1]} stroke="rgba(173,223,241,1)" vectorEffect="non-scaling-stroke"
                  strokeWidth={hovered === i ? 2 : 1.2} style={{ transition: 'opacity .3s, stroke-width .3s' }} opacity={lineOpacity(i)}
                  initial={animated ? { x2: item.to[0], y2: item.to[1] } : false} animate={{ x2: item.from[0], y2: item.from[1] }} transition={{ delay: t0 + 1 + i * 0.12, duration: 0.6, ease: EASE }} />
              ))}
            </svg>
            <motion.div className="absolute left-[47%] top-[18%] size-[400px] -translate-x-1/2 rounded-full bg-[#2cc4d6]/25 blur-3xl"
              initial={animated ? { opacity: 0, scale: 0.5 } : false} animate={{ opacity: 1, scale: 1 }} transition={{ delay: t0 + 0.3, duration: 1.4, ease: EASE }} />
            {/* The spotlight comes up on the student. */}
            <motion.div className="absolute bottom-0 left-[47%] z-10 h-[88%] -translate-x-1/2"
              initial={animated ? { opacity: 0, filter: 'brightness(0.2)' } : false} animate={{ opacity: 1, filter: 'brightness(1)' }} transition={{ delay: t0 + 0.2, duration: 1.2, ease: EASE }}>
              <img src={studentPortrait} alt="" className="h-full w-auto [filter:brightness(.95)_contrast(1.05)_drop-shadow(-6px_0_18px_rgba(44,196,214,.28))] [mask-image:linear-gradient(to_bottom,#000_86%,transparent)]" />
            </motion.div>
            {animated && motes.map((m, i) => (
              <span key={i} className="absolute z-10 rounded-full bg-[#ADDFF1]" style={{
                left: `${m.x}%`, top: `${m.y}%`, width: m.size, height: m.size, opacity: 0, boxShadow: '0 0 6px rgba(173,223,241,.8)',
                animation: `es-mote ${m.duration}s linear ${t0 + m.delay}s infinite`, '--mote-opacity': m.opacity, '--mote-dx': `${m.dx}px`,
              } as CSSProperties} />
            ))}
            {orbit.map((item, i) => (
              <motion.span key={item.title} className="absolute z-20 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: `${item.to[0]}%`, top: `${item.to[1]}%` }}
                initial={animated ? { scale: 0 } : false} animate={{ scale: hovered === i ? 1.6 : 1 }} transition={{ delay: hovered === null ? t0 + 1.4 + i * 0.12 : 0, duration: 0.4 }}>
                <span className="absolute size-4 rounded-full bg-[#ADDFF1]/40 motion-safe:animate-ping" />
                <span className="size-2.5 rounded-full bg-[#ADDFF1] shadow-[0_0_12px_rgba(173,223,241,.9)]" />
              </motion.span>
            ))}
            {/* Pulses of light travel along each line into the student, like data feeding the explanation. */}
            {animated && orbit.map((item, i) => (
              <motion.span key={`pulse-${item.title}`} className="absolute z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_3px_rgba(173,223,241,.8)]"
                initial={{ left: `${item.from[0]}%`, top: `${item.from[1]}%`, opacity: 0 }}
                animate={{ left: [`${item.from[0]}%`, `${item.to[0]}%`], top: [`${item.from[1]}%`, `${item.to[1]}%`], opacity: [0, 1, 1, 0] }}
                transition={{ delay: t0 + 2.2 + i * 0.55, duration: 1.8, repeat: Infinity, repeatDelay: 2.8, ease: 'easeInOut' }} />
            ))}
          </motion.div>

          <motion.div className="relative z-20 xl:absolute xl:left-0 xl:top-0 xl:max-w-[44%]" {...enter(0.1)}>
            <h1 className="font-display text-6xl leading-[0.95] tracking-[-0.04em] sm:text-7xl xl:whitespace-nowrap xl:text-[3.9rem]">
              <span className="bg-[linear-gradient(180deg,#ffffff_10%,#bfe7f4_70%,#7fd3e6)] bg-clip-text font-extrabold text-transparent">EDUSHIELD</span>{' '}
              <span className="bg-[linear-gradient(180deg,#e6f6fb,#7fd3e6)] bg-clip-text font-light text-transparent">AI</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg xl:max-w-[340px] xl:text-base">
              Explainable early warning for student success: see which students are at risk, why the model thinks so, and what support to offer next.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 xl:flex-nowrap">
              <button type="button" onClick={focusCard} className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#03111d] shadow-xl transition hover:bg-[#e6f6fb]">Sign in to your workspace</button>
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur"><CircleCheck size={17} className="text-[#ADDFF1]" />Explainable by design</span>
            </div>
          </motion.div>

          <motion.div id="signin-card" className="es-tile relative z-30 w-full rounded-[24px] p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)] sm:p-8 lg:max-w-md xl:absolute xl:bottom-0 xl:right-0 xl:w-[360px] xl:p-6" {...enter(0.35, 30)}>
            {children}
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2 xl:block">
            {orbit.map((item, i) => (
              <OrbitChip key={item.title} item={item} index={i} delay={t0 + 1.2 + i * 0.12} animated={animated} highlighted={hovered === i} onHover={setHovered} x={chipX} y={chipY} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
