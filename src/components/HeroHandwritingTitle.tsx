import React, { Suspense, lazy, Component, type ReactNode } from 'react';
import { cn } from '../lib/utils';

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
          className={cn('text-gray-900 dark:text-white', className)}
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5.5rem)', lineHeight: 1.05 }}
          duration={2400}
          delay={120}
        >
          Sparks into substance
        </TegakiRenderer>
      );
    },
  };
});

const fallbackTitle = (
  <span className="text-gray-900 dark:text-white font-bold tracking-tighter">
    Sparks into substance
  </span>
);

export function HeroHandwritingTitle({ className }: { className?: string }) {
  return (
    <TegakiErrorBoundary fallback={fallbackTitle}>
      <Suspense fallback={fallbackTitle}>
        <TegakiHero className={className} />
      </Suspense>
    </TegakiErrorBoundary>
  );
}
