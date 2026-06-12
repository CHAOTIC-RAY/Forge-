import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  supabase,
  Profile,
  upsertProfileByFirebaseUid,
  getProfile,
} from '../lib/supabase';

interface AuthState {
  firebaseUser: User | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}

export function useSupabaseAuth(): AuthState & {
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    profile: null,
    loading: true,
    error: null,
  });

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setState(prev => ({ ...prev, profile: null, loading: false }));
      return;
    }

    try {
      const profile = await getProfile(firebaseUser.uid);
      if (profile) {
        setState(prev => ({ ...prev, profile, loading: false }));
      } else {
        // Create profile if missing
        const newProfile = await upsertProfileByFirebaseUid(
          firebaseUser.uid,
          firebaseUser.email || '',
          firebaseUser.displayName || undefined,
          firebaseUser.photoURL || undefined
        );
        setState(prev => ({ ...prev, profile: newProfile, loading: false }));
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setState(prev => ({ ...prev, error: error as Error, loading: false }));
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setState(prev => ({ ...prev, loading: true, firebaseUser }));

      if (firebaseUser) {
        try {
          // Sync Firebase user to Supabase profile
          const profile = await upsertProfileByFirebaseUid(
            firebaseUser.uid,
            firebaseUser.email || '',
            firebaseUser.displayName || undefined,
            firebaseUser.photoURL || undefined
          );

          // Set the Supabase session context for RLS
          await supabase.rpc('set_config', {
            name: 'request.jwt.firebase_uid',
            value: firebaseUser.uid,
          });

          setState({
            firebaseUser,
            profile,
            loading: false,
            error: null,
          });
        } catch (error) {
          console.error('Error syncing user to Supabase:', error);
          setState({
            firebaseUser,
            profile: null,
            loading: false,
            error: error as Error,
          });
        }
      } else {
        setState({
          firebaseUser: null,
          profile: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    await supabase.auth.signOut();
    setState({
      firebaseUser: null,
      profile: null,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, refreshProfile, signOut };
}

// Export a simple hook for just getting the profile
export function useProfile(): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        setProfile(null);
        return;
      }

      try {
        const userProfile = await getProfile(firebaseUser.uid);
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      }
    };

    loadProfile();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) loadProfile();
      else setProfile(null);
    });

    return () => unsubscribe();
  }, []);

  return profile;
}
