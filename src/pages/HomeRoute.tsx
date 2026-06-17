import React, { Suspense } from 'react';
import { LandingView } from '../components/LandingView';
import { ForgeLoader } from '../components/ForgeLoader';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

const App = React.lazy(() => import('../App'));

export function HomeRoute() {
  const { firebaseUser, loading } = useSupabaseAuth();

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
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#191919] flex items-center justify-center">
          <ForgeLoader size={48} />
        </div>
      }
    >
      <App />
    </Suspense>
  );
}
