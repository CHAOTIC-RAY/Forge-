import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadBase64Image(base64Data: string, path: string): Promise<string> {
  const match = base64Data.match(/^data:([^;]+);base64,(.*)$/);
  const dataToUpload = match ? match[2] : base64Data;
  const mimeType = match ? match[1] : 'image/png';
  
  const storageRef = ref(storage, path);
  await uploadString(storageRef, dataToUpload, 'base64', { contentType: mimeType });
  return getDownloadURL(storageRef);
}

export async function deleteAppStorageFile(url: string): Promise<void> {
  if (!url || !url.includes('firebasestorage.googleapis.com')) return;
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
  }
}
