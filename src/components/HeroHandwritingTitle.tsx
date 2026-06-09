import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function HeroHandwritingTitle({ className }: { className?: string }) {
  // Let's create an elegant, design-forward typography animation matching "Forge" (ideas -> assets)
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 18,
        stiffness: 120,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        'font-display font-medium tracking-tight text-white flex flex-wrap items-center gap-x-4 md:gap-x-5 gap-y-2 select-none text-left w-full',
        className
      )}
      style={{
        fontSize: 'clamp(2.5rem, 6.5vw, 4.75rem)',
        lineHeight: 1.1,
      }}
    >
      {/* Word 1: Sparks */}
      <motion.div 
        variants={itemVariants} 
        className="relative inline-flex items-center"
        animate={{
          '--spark-color-1': ['#2383E2', '#E2234D', '#E2A123', '#23E25D', '#9333EA', '#2383E2'],
          '--spark-color-2': ['#E2A123', '#23E25D', '#9333EA', '#2383E2', '#E2234D', '#E2A123'],
        } as any}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear'
        }}
      >
        {/* Warm ambient spark glow underneath */}
        <span 
          style={{ 
            backgroundImage: 'linear-gradient(to right, var(--spark-color-1, #2383E2), var(--spark-color-2, #E2A123))',
            opacity: 0.35,
          }}
          className="absolute -inset-3 rounded-full blur-2xl pointer-events-none" 
        />
        <span 
          style={{ 
            backgroundImage: 'linear-gradient(to right, var(--spark-color-1, #2383E2), var(--spark-color-2, #E2A123))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
          className="relative font-extrabold bg-clip-text text-transparent"
        >
          Sparks
        </span>
        
        {/* Minimal dynamic spark element */}
        <motion.span
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 15, -15, 0],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            color: 'var(--spark-color-2, #E2A123)',
          }}
          className="absolute -top-1 -right-4 text-2xl drop-shadow-[0_0_10px_var(--spark-color-2,rgba(251,191,36,0.6))]"
        >
          ✦
        </motion.span>
      </motion.div>

      {/* Connection: into */}
      <motion.span
        variants={itemVariants}
        className="font-normal text-white/80 dark:text-white/70 italic text-[0.85em] tracking-normal"
      >
        into
      </motion.span>

      {/* Word 3: substance */}
      <motion.div 
        variants={itemVariants} 
        className="relative inline-block overflow-hidden rounded-2xl px-4 py-1 border border-white/10 bg-white/5 dark:bg-[#202020]/20 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
      >
        {/* Shimmer sweep effect */}
        <motion.div
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 1.5,
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -skew-x-12 pointer-events-none"
        />
        
        <span className="relative font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-50 to-blue-200">
          substance
        </span>
      </motion.div>
    </motion.div>
  );
}
