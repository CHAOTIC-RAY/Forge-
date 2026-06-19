import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  or,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import type { Business, Post } from '../data';
import { db, handleFirestoreError, OperationType } from './firebase';

export function subscribeToLegacyBusinesses(
  userId: string,
  callback: (businesses: Business[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, 'businesses'),
    or(where('ownerId', '==', userId), where('members', 'array-contains', userId))
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Business));
    },
    (error) => {
      console.error('[legacy] businesses onSnapshot error:', error);
      handleFirestoreError(error, OperationType.GET, 'businesses');
      onError?.(error as Error);
    }
  );
}

export function subscribeToLegacyPosts(
  params: {
    userId: string;
    activeBusinessId?: string;
    sharedBusinessId?: string;
    calendarMode: 'work' | 'personal';
    isViewOnly: boolean;
  },
  callback: (posts: Post[]) => void,
  onError?: (error: Error) => void
): () => void {
  const { userId, activeBusinessId, sharedBusinessId, calendarMode, isViewOnly } = params;

  let q;
  if (isViewOnly && sharedBusinessId) {
    q = query(collection(db, 'posts'), where('businessId', '==', sharedBusinessId));
  } else if (calendarMode === 'personal') {
    q = query(collection(db, 'posts'), where('userId', '==', userId));
  } else if (activeBusinessId) {
    q = query(collection(db, 'posts'), where('businessId', '==', activeBusinessId));
  } else {
    callback([]);
    return () => undefined;
  }

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Post));
    },
    (error) => {
      console.error('[legacy] posts onSnapshot error:', error);
      handleFirestoreError(error, OperationType.GET, 'posts');
      onError?.(error as Error);
    }
  );
}

export async function saveLegacyPost(post: Post): Promise<void> {
  await setDoc(doc(db, 'posts', post.id), post, { merge: true });
}

export async function deleteLegacyPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function getLegacyUserOnboardingComplete(userId: string): Promise<boolean | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  return snap.data()?.onboardingComplete === true;
}
