import React, { Suspense, lazy } from 'react';
import { cn } from '../lib/utils';

const TegakiHero = lazy(async () => {
  const [{ TegakiRenderer }, caveat] = await Promise.all([
    import('tegaki/react'),
    import('tegaki/fonts/caveat'),
  ]);
  return {
    default: function HeroTegaki({ className }: { className?: string }) {
      return (
        <TegakiRenderer
          font={caveat}
          className={cn('text-gray-900 dark:text-white', className)}
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)', lineHeight: 1.05 }}
          duration={3200}
          delay={200}
        >
          Sparks into substance
        </TegakiRenderer>
      );
    },
  };
});

export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <Suspense
      fallback={
        <span className={cn('text-gray-900 dark:text-white font-bold tracking-tighter', className)}>
          Sparks into substance
        </span>
      }
    >
      <TegakiHero className={className} />
    </Suspense>
  );
}
