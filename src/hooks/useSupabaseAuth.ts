import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  Profile,
  upsertProfileByFirebaseUid,
  getProfile,
  setFirebaseUidForRls,
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

  const syncProfile = useCallback(async (firebaseUser: User): Promise<Profile> => {
    await firebaseUser.getIdToken(true);
    await setFirebaseUidForRls(firebaseUser.uid);

    const existing = await getProfile(firebaseUser.uid);
    if (existing) {
      return existing;
    }

    return upsertProfileByFirebaseUid(
      firebaseUser.uid,
      firebaseUser.email || '',
      firebaseUser.displayName || undefined,
      firebaseUser.photoURL || undefined
    );
  }, []);

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setState(prev => ({ ...prev, profile: null, loading: false }));
      return;
    }

    try {
      const profile = await syncProfile(firebaseUser);
      setState(prev => ({ ...prev, profile, loading: false, error: null }));
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setState(prev => ({ ...prev, error: error as Error, loading: false }));
    }
  }, [syncProfile]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setState(prev => ({ ...prev, loading: true, firebaseUser }));

      if (firebaseUser) {
        try {
          const profile = await syncProfile(firebaseUser);
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
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    await auth.signOut();
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
        await firebaseUser.getIdToken(false);
        await setFirebaseUidForRls(firebaseUser.uid);
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
