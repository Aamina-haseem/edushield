// Full-screen velvet curtain behind the login panel: folds hang straight at the top and sweep out
// towards the bottom-left (strongest on the left), lit by a spotlight behind the headline and a
// second glow on the lower sweep. Drawn once as SVG; the fold layout is deterministic.

const W = 1600;
const H = 1000;

/** Repeatable pseudo-random value in [0, 1) for fold i, so the curtain looks the same on every render. */
function noise(i: number) {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

const folds: { x: number; width: number; sweep: number; light: number }[] = [];
for (let x = -80, i = 0; x < W + 80; i++) {
  const width = 24 + 22 * noise(i);
  const leftness = Math.max(0, 1 - (x + 80) / (W * 0.75));
  folds.push({ x, width, sweep: 30 + 340 * leftness * leftness, light: 0.12 + 0.24 * noise(i + 97) });
  x += width;
}

function foldPath(x: number, sweep: number) {
  return `M${x},-40 L${x},340 C${x},620 ${x - sweep * 0.3},820 ${x - sweep},${H + 60}`;
}

export function Curtain() {
  return (
    <div className="es-curtain-light pointer-events-none absolute inset-0 origin-top motion-safe:animate-[es-sway_11s_ease-in-out_infinite]" aria-hidden="true">
      <svg className="size-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="curtain-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b5672" />
            <stop offset="45%" stopColor="#07405d" />
            <stop offset="100%" stopColor="#042b42" />
          </linearGradient>
          <radialGradient id="curtain-spot-top" cx="0.38" cy="0.18" r="0.5">
            <stop offset="0%" stopColor="#a6ecf7" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#a6ecf7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="curtain-spot-low" cx="0.1" cy="0.96" r="0.32">
            <stop offset="0%" stopColor="#a6ecf7" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#a6ecf7" stopOpacity="0" />
          </radialGradient>
          <filter id="curtain-soft" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="3.6" />
          </filter>
        </defs>
        <rect width={W} height={H} fill="url(#curtain-base)" />
        <g filter="url(#curtain-soft)" fill="none" strokeLinecap="round">
          {folds.map((f, i) => <path key={`shade-${i}`} d={foldPath(f.x, f.sweep)} stroke="#000" strokeOpacity={0.55} strokeWidth={f.width * 0.6} />)}
          {folds.map((f, i) => <path key={`sheen-${i}`} d={foldPath(f.x + f.width * 0.5, f.sweep)} stroke="#a6ecf7" strokeOpacity={f.light} strokeWidth={f.width * 0.34} />)}
        </g>
        <rect width={W} height={H} fill="url(#curtain-spot-top)" />
        <rect width={W} height={H} fill="url(#curtain-spot-low)" />
      </svg>
    </div>
  );
}
