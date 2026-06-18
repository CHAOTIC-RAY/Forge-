import React, { Suspense } from 'react';
import { LandingView } from '../components/LandingView';
import { ForgeLoader } from '../components/ForgeLoader';
import { LocalAiTabLoader, useLocalAiBootstrap } from '../components/LocalAiTabLoader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const App = React.lazy(() => import('../App'));

export function HomeRoute() {
  const { firebaseUser, loading } = useSupabaseAuth();
  useLocalAiBootstrap(!!firebaseUser);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
        <ForgeLoader size={48} />
      </div>
    );
  }

  if (!firebaseUser) {
    return <LandingView />;
  }

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-white dark:bg-[#191919] flex flex-col items-center justify-center gap-4">
            <ForgeLoader size={48} />
            <LocalAiTabLoader size={32} />
            <p className="text-sm text-[#757681] dark:text-[#9B9A97]">Loading workspace…</p>
          </div>
        }
      >
        <App />
      </Suspense>
    </ErrorBoundary>
  );
}
