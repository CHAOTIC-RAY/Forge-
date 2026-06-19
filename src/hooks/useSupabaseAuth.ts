import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  Profile,
} from '../lib/supabase';
import { clearSupabaseAccessToken, ensureSupabaseAccessToken } from '../lib/supabaseSession';
import { firestoreEntityId } from '../lib/firestoreMigrateIds';
import { syncProfileViaApi } from '../lib/profileApi';

function buildFallbackProfile(firebaseUser: User): Profile {
  const id =
    firestoreEntityId('profile', firebaseUser.uid) ||
    crypto.randomUUID();
  const now = new Date().toISOString();
  return {
    id,
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    display_name: firebaseUser.displayName || undefined,
    photo_url: firebaseUser.photoURL || undefined,
    created_at: now,
    updated_at: now,
    settings: {},
    ai_settings: {},
  };
}

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

  const syncProfile = useCallback(async (_firebaseUser: User): Promise<Profile> => {
    return syncProfileViaApi();
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
      if (!firebaseUser) {
        clearSupabaseAccessToken();
        setState({
          firebaseUser: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }

      setState(prev => ({ ...prev, loading: true, firebaseUser }));

      try {
        await ensureSupabaseAccessToken(true);
        const profile = await syncProfile(firebaseUser);
        setState({
          firebaseUser,
          profile,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error syncing user to Supabase:', error);
        clearSupabaseAccessToken();
        try {
          const profile = await syncProfile(firebaseUser);
          setState({
            firebaseUser,
            profile,
            loading: false,
            error: error as Error,
          });
        } catch (syncError) {
          console.error('Profile API sync also failed:', syncError);
          setState({
            firebaseUser,
            profile: buildFallbackProfile(firebaseUser),
            loading: false,
            error: error as Error,
          });
        }
      }
    });

    return () => unsubscribe();
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    clearSupabaseAccessToken();
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
        const userProfile = await syncProfileViaApi();
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfile(null);
      }
    };

    loadProfile();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) loadProfile();
      else {
        clearSupabaseAccessToken();
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return profile;
}
