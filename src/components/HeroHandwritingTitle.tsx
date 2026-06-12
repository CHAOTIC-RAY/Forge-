import React, { Suspense, lazy, Component, type ReactNode } from 'react';
import { cn } from '../lib/utils';
/** Hero handwriting draw — faster than background flame loop for snappier first impression */
const HERO_HANDWRITE_DURATION_MS = 900;
const HERO_HANDWRITE_DELAY_MS = 40;

class TegakiErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const TegakiHero = lazy(async () => {
  const [reactMod, fontMod] = await Promise.all([
    import('tegaki/react'),
    import('tegaki/fonts/caveat'),
  ]);

  const TegakiRenderer = reactMod.TegakiRenderer;
  const caveat = fontMod.default;
  if (!caveat || typeof caveat !== 'object' || !('glyphData' in caveat)) {
    throw new Error('Invalid tegaki Caveat font bundle');
  }

  return {
    default: function HeroTegaki({ className }: { className?: string }) {
      return (
        <TegakiRenderer
          font={caveat}
          className={cn('text-white', className)}
          style={{ fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)', lineHeight: 1.05 }}
          duration={HERO_HANDWRITE_DURATION_MS}
          delay={HERO_HANDWRITE_DELAY_MS}
        >
          Sparks into substance
        </TegakiRenderer>
      );
    },
  };
});

function StaticFallback({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'text-white font-bold tracking-tighter block w-full text-left',
        className
      )}
      style={{
        fontSize: 'clamp(2.25rem, 6.5vw, 4.75rem)',
        lineHeight: 1.05,
      }}
    >
      Sparks into substance
    </span>
  );
}

/** Hero headline — Caveat handwriting drawn letter-by-letter (Tegaki), synced to flame stroke. */
export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <TegakiErrorBoundary fallback={<StaticFallback className={className} />}>
      <Suspense fallback={<StaticFallback className={className} />}>
        <TegakiHero className={className} />
      </Suspense>
    </TegakiErrorBoundary>
  );
}
