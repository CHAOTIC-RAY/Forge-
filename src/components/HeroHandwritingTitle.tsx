import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { FORGE_SCRIBBLE_DRAW_S } from './ForgeLogo';

/**
 * Hero headline — Poppins display (Forge UI) with a left-to-right reveal
 * timed to the background ScribbleFlame stroke draw (~2.4s).
 */
export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <motion.span
      className={cn(
        'font-display font-bold tracking-tighter text-white block w-full text-left',
        className
      )}
      style={{
        fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)',
        lineHeight: 1.05,
      }}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{
        duration: FORGE_SCRIBBLE_DRAW_S,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      Sparks into substance
    </motion.span>
  );
}
