import { useEffect, useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  Profile,
  upsertProfileByFirebaseUid,
  getProfile,
  setFirebaseUidForRls,
} from '../lib/supabase';
import { clearSupabaseAccessToken, exchangeSupabaseAccessToken } from '../lib/supabaseSession';
import { repairWorkspaceOwnership } from '../lib/workspaceRepair';

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
    await exchangeSupabaseAccessToken(true);
    await setFirebaseUidForRls(firebaseUser.uid);

    const existing = await getProfile(firebaseUser.uid);
    const profile =
      existing ||
      (await upsertProfileByFirebaseUid(
        firebaseUser.uid,
        firebaseUser.email || '',
        firebaseUser.displayName || undefined,
        firebaseUser.photoURL || undefined
      ));

    try {
      await repairWorkspaceOwnership();
    } catch (error) {
      console.warn('[auth] workspace ownership repair failed:', error);
    }

    const refreshed = await getProfile(firebaseUser.uid);
    return refreshed || profile;
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
        setState({
          firebaseUser,
          profile: null,
          loading: false,
          error: error as Error,
        });
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
        await exchangeSupabaseAccessToken(false);
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
      else {
        clearSupabaseAccessToken();
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  return profile;
}
