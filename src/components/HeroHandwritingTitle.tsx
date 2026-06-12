import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <div
      className={cn('select-none font-black tracking-tighter relative', className)}
      style={{ fontSize: 'clamp(2.4rem, 7vw, 5rem)', lineHeight: 1.02 }}
    >
      <div className="flex items-baseline gap-[0.18em] flex-wrap">
        {/* "Sparks" — pure CSS cycling gradient, no JS animation touching the background */}
        <span className="relative inline-block">
          {/* Ambient glow behind the word */}
          <span
            className="spark-glow-bg absolute inset-0 blur-2xl opacity-20 pointer-events-none rounded-full"
            aria-hidden
          />
          {/* The gradient text itself */}
          <span className="spark-gradient-text relative">Sparks</span>
          {/* Floating star — Framer Motion is fine here, it only animates y/opacity/color, not background */}
          <motion.span
            className="absolute -top-[0.12em] -right-[0.3em] text-[0.38em] pointer-events-none spark-gradient-text"
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
