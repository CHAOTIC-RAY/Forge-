import React, { useEffect, useRef, useState } from 'react';
import { motion, animate } from 'motion/react';
import { cn } from '../lib/utils';

const SPARK_PALETTE: [string, string][] = [
  ['#60a5fa', '#818cf8'],
  ['#f87171', '#fb923c'],
  ['#fbbf24', '#f59e0b'],
  ['#34d399', '#10b981'],
  ['#a78bfa', '#e879f9'],
];

export function HeroHandwritingTitle({ className }: { className?: string }) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const sparksRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const starRef = useRef<HTMLSpanElement>(null);

  const [c1, c2] = SPARK_PALETTE[paletteIdx];

  useEffect(() => {
    const id = setInterval(() => {
      setPaletteIdx(i => (i + 1) % SPARK_PALETTE.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const [nc1, nc2] = SPARK_PALETTE[paletteIdx];
    const opts = { duration: 1.1, ease: [0.4, 0, 0.2, 1] as any };

    if (sparksRef.current) {
      animate(sparksRef.current, { '--spark-color-1': nc1, '--spark-color-2': nc2 } as any, opts);
    }
    if (glowRef.current) {
      animate(glowRef.current, { '--spark-color-1': nc1, '--spark-color-2': nc2 } as any, opts);
    }
    if (starRef.current) {
      animate(starRef.current, { color: nc1 } as any, opts);
    }
  }, [paletteIdx]);

  return (
    <div
      className={cn('select-none font-black tracking-tighter relative', className)}
      style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)', lineHeight: 1.02 }}
    >
      <div className="flex items-baseline gap-[0.18em] flex-wrap">
        <span className="relative inline-block">
          <motion.span
            ref={glowRef}
            className="absolute inset-0 blur-2xl opacity-25 pointer-events-none rounded-full"
            style={
              {
                background: `linear-gradient(135deg, var(--spark-color-1, ${c1}), var(--spark-color-2, ${c2}))`,
                '--spark-color-1': c1,
                '--spark-color-2': c2,
              } as React.CSSProperties
            }
            aria-hidden
          />
          <motion.span
            ref={sparksRef}
            className="relative"
            style={
              {
                background: `linear-gradient(135deg, var(--spark-color-1, ${c1}) 0%, var(--spark-color-2, ${c2}) 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                '--spark-color-1': c1,
                '--spark-color-2': c2,
              } as React.CSSProperties
            }
          >
            Sparks
          </motion.span>
          <motion.span
            ref={starRef}
            className="absolute -top-[0.12em] -right-[0.3em] text-[0.38em] pointer-events-none"
            style={{ color: c1 }}
            animate={{ y: [0, -3, 0], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            ✦
          </motion.span>
        </span>

        <motion.span
          className="text-[#37352F]/40 dark:text-white/40 font-light"
          style={{ fontStyle: 'italic', fontWeight: 300 }}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.14, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          into
        </motion.span>
      </div>

      <motion.div
        className="text-[#37352F] dark:text-[#EBE9ED]"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        substance
      </motion.div>
    </div>
  );
}
