import React, { Suspense } from 'react';
import { LandingView } from '../components/LandingView';
import { ForgeWorkspaceLoader } from '../components/ForgeWorkspaceLoader';
import { useLocalAiBootstrap } from '../components/LocalAiTabLoader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const App = React.lazy(() => import('../App'));

export function HomeRoute() {
  const { firebaseUser, loading } = useSupabaseAuth();
  useLocalAiBootstrap(!!firebaseUser);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
        <ForgeWorkspaceLoader stage="auth" />
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
          <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
            <ForgeWorkspaceLoader stage="app" includeLocalAiStatus />
          </div>
        }
      >
        <App />
      </Suspense>
    </ErrorBoundary>
  );
}
