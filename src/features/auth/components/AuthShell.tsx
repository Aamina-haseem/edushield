import type { ReactNode } from 'react';
import graduationCapPhoto from '@/features/auth/components/photos/graduation_cap_cutout.png';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f4f8fb] p-4 dark:bg-[#071521] sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-[0_30px_100px_rgba(0,49,82,0.16)] dark:border-white/10 dark:bg-[#0D2233] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#03101f] px-12 py-14 text-center text-white lg:flex lg:flex-col lg:items-center lg:justify-center">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#ADDFF1]/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative z-10 flex max-w-md flex-col items-center">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full ring-4 ring-[#ADDFF1]/25 shadow-[0_0_40px_rgba(173,223,241,0.35)]">
              <img src={graduationCapPhoto} alt="EduShield" className="size-full object-cover" />
            </div>
            <p className="mt-5 font-serif text-4xl tracking-wide text-slate-100">EduShield</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400"></p>

            <div className="mt-6 h-px w-16 bg-white/25" />

            <h1 className="mt-8 font-serif text-4xl leading-tight text-white">
              Intelligence That
              <br />
              <span className="font-serif italic text-[#7db9e8]">Protects Potential</span>
            </h1>
            <p className="mt-6 text-sm leading-7 text-white/60">
              Empower advisors with explainable AI to detect risk early, understand what matters, and take action that changes lives.
            </p>
          </div>

          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full opacity-80" viewBox="0 0 760 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-20 220C120 260 220 120 360 160C500 200 560 80 780 130" stroke="#3B82F6" strokeOpacity="0.55" strokeWidth="2" />
            <path d="M-20 250C140 290 240 160 380 195C520 230 580 120 780 170" stroke="#60A5FA" strokeOpacity="0.4" strokeWidth="2" />
            <path d="M-20 190C120 230 220 90 360 130C500 170 560 55 780 105" stroke="#93C5FD" strokeOpacity="0.3" strokeWidth="1.5" />
          </svg>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
