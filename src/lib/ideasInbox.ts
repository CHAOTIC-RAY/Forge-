import { auth, db } from './firebase';
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

export async function saveTextToIdeasInbox(
  businessId: string,
  title: string,
  content: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to save to Ideas.');
  if (!businessId) throw new Error('Select a workspace first.');

  const q = query(
    collection(db, 'notebooks'),
    where('businessId', '==', businessId),
    where('userId', '==', user.uid)
  );
  const snapshot = await getDocs(q);

  let notebookId: string;
  let currentBlocks: any[] = [];

  if (!snapshot.empty) {
    notebookId = snapshot.docs[0].id;
    currentBlocks = snapshot.docs[0].data().blocks || [];
  } else {
    notebookId = crypto.randomUUID();
    await setDoc(doc(db, 'notebooks', notebookId), {
      id: notebookId,
      businessId,
      userId: user.uid,
      title: 'Ideas',
      blocks: [],
      links: [],
      folders: [],
      updatedAt: serverTimestamp(),
    });
  }

  const newBlock = {
    id: crypto.randomUUID(),
    type: 'text',
    title: title.slice(0, 200),
    content,
    status: 'inbox',
    folderId: null,
    createdAt: Date.now(),
  };

  await updateDoc(doc(db, 'notebooks', notebookId), {
    blocks: [newBlock, ...currentBlocks],
    updatedAt: serverTimestamp(),
  });
}
