import React, { Suspense, lazy, Component, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { FORGE_SCRIBBLE_DRAW_S } from './ForgeLogo';

const HANDWRITE_DURATION_MS = Math.round(FORGE_SCRIBBLE_DRAW_S * 1000);

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
          duration={HANDWRITE_DURATION_MS}
          delay={120}
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
