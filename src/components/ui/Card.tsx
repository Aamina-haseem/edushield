import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

// Surface, border and shadow come from `.es-card` (src/styles/index.css): white in light mode, frosted glass in dark.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('es-card rounded-3xl', className)} {...props} />;
}
