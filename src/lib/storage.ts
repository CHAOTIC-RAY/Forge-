// Storage utility using Cloudinary via client-side direct upload

import { getAiSettings } from './gemini';

// Simple IndexedDB helper for large files
const DB_NAME = 'ForgeStorageDB';
const STORE_NAME = 'image_backups';

async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveToIndexedDB(key: string, data: string): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("[Storage] IndexedDB not available, falling back to localStorage", e);
    localStorage.setItem(key, data);
  }
}

/**
 * Uploads a base64 image string to Cloudinary via client-side direct upload and returns the secure URL.
 * @param base64Data The base64 data URL string.
 * @param path The path (used as folder/filename hint).
 * @returns The secure URL of the uploaded image.
 */
export async function uploadBase64Image(base64Data: string, path: string): Promise<string> {
  // If it's already a URL (e.g. from a previous upload or external source), return it
  if (base64Data.startsWith('http')) {
    return base64Data;
  }

  // Extract the actual base64 string and mime type
  if (!base64Data.startsWith('data:')) {
    throw new Error('Invalid base64 data URL');
  }

  // Save to IndexedDB first as a backup
  try {
    const backupKey = `img_backup_${Date.now()}`;
    await saveToIndexedDB(backupKey, base64Data);
    console.log(`[Storage] Image backed up to IndexedDB with key: ${backupKey}`);
  } catch (e) {
    console.warn("[Storage] Could not save image to local backup", e);
  }

  try {
    console.log(`[Storage] Starting Cloudinary upload for path: ${path}`);
    const startTime = Date.now();

    const settings = getAiSettings();
    const cloudName = settings.cloudinaryCloudName;
    const apiKey = settings.cloudinaryApiKey;
    const apiSecret = settings.cloudinaryApiSecret;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Missing Cloudinary credentials in Settings.");
    }

    // Convert base64 to Blob to send as multipart/form-data
    console.log("[Storage] Converting base64 to blob...");
    const response = await fetch(base64Data);
    if (!response.ok) throw new Error(`Failed to fetch base64 data: ${response.statusText}`);
    const blob = await response.blob();
    console.log(`[Storage] Blob created: ${blob.size} bytes, type: ${blob.type}`);
    
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = `timestamp=${timestamp}${apiSecret}`;
    
    // Generate SHA-1 signature
    const msgBuffer = new TextEncoder().encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);

    console.log("[Storage] Sending POST request directly to Cloudinary API...");
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
    console.log(`[Storage] Cloudinary responded with status: ${uploadResponse.status}`);

    if (!uploadResponse.ok) {
      let errorMessage = 'Failed to upload to Cloudinary';
      try {
        const errorData = await uploadResponse.json();
        console.error('[Storage] Cloudinary returned error JSON:', errorData);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        errorMessage = `Upload failed with status ${uploadResponse.status}`;
      }
      throw new Error(errorMessage);
    }

    const data = await uploadResponse.json();
    const duration = Date.now() - startTime;
    console.log(`[Storage] Cloudinary upload completed in ${duration}ms: ${data.secure_url}`);
    
    return data.secure_url;
  } catch (e: any) {
    console.error('[Storage] Cloudinary upload failed:', e);
    throw e;
  }
}
