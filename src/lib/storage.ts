// Storage utility using Cloudinary via client-side direct upload

import { getAiSettings, getServerConfig, fetchServerConfig } from './gemini';

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
 * Uploads a base64 image string to Cloudinary or Firebase Storage.
 * Firebase Storage is used as a fallback if Cloudinary credentials are missing.
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

  const settings = getAiSettings();
  let serverConfig = getServerConfig();
  
  if (!serverConfig) {
    await fetchServerConfig();
    serverConfig = getServerConfig();
  }

  const cloudName = settings.cloudinaryCloudName || serverConfig?.cloudinaryCloudName;
  const apiKey = settings.cloudinaryApiKey;
  const apiSecret = settings.cloudinaryApiSecret;

  const hasLocalCreds = !!(settings.cloudinaryCloudName && settings.cloudinaryApiKey && settings.cloudinaryApiSecret);
  const hasServerCreds = !!serverConfig?.cloudinaryCloudName;

  // Check if Cloudinary credentials are missing
  if (!hasLocalCreds && !hasServerCreds) {
    throw new Error('Cloudinary credentials missing. Please configure Cloudinary in API settings.');
  }

  const waitForOnline = async () => {
    if (navigator.onLine) return;
    return new Promise<void>((resolve) => {
      const handleOnline = () => {
        window.removeEventListener('online', handleOnline);
        resolve();
      };
      window.addEventListener('online', handleOnline);
    });
  };

  try {
    console.log(`[Storage] Starting Cloudinary upload for path: ${path}`);
    const startTime = Date.now();
    
    // Wait for online status before attempting
    await waitForOnline();
    
    // Convert base64 to Blob to send as multipart/form-data
    const arr = base64Data.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });

    let uploadResponse;

    if (hasLocalCreds && apiKey && apiSecret) {
      console.log(`[Storage] Performing direct Cloudinary upload to: ${cloudName}`);
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

      uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
    } else {
      console.log("[Storage] Performing server-side Cloudinary upload proxy");
      const formData = new FormData();
      formData.append('image', blob, 'upload.jpg');
      
      // Pass any partial settings we might have (though usually it will just use server env)
      if (settings.cloudinaryCloudName) formData.append('cloudName', settings.cloudinaryCloudName);
      if (settings.cloudinaryApiKey) formData.append('apiKey', settings.cloudinaryApiKey);
      if (settings.cloudinaryApiSecret) formData.append('apiSecret', settings.cloudinaryApiSecret);

      uploadResponse = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });
    }

    if (!uploadResponse.ok) {
      let errorMessage = 'Failed to upload to Cloudinary';
      try {
        const errorData = await uploadResponse.json();
        errorMessage = errorData.error?.message || errorData.error || errorData.details || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    const data = await uploadResponse.json();
    const duration = Date.now() - startTime;
    const finalUrl = data.secure_url || data.url;
    
    if (!finalUrl) {
      throw new Error('Cloudinary response missing URL');
    }

    console.log(`[Storage] Cloudinary upload completed in ${duration}ms: ${finalUrl}`);
    return finalUrl;
  } catch (e: any) {
    console.error('[Storage] Cloudinary upload failed:', e);
    throw e;
  }
}

export async function deleteAppStorageFile(url: string): Promise<void> {
  if (url.includes('firebasestorage.googleapis.com')) {
    try {
      const { ref, deleteObject } = await import('firebase/storage');
      const { storage } = await import('./firebase');
      const imageRef = ref(storage, url);
      await deleteObject(imageRef);
      console.log(`[Storage] Deleted Firebase image: ${url}`);
    } catch (e: any) {
      if (e?.code === 'storage/object-not-found') {
        console.warn(`[Storage] Firebase image already deleted or not found: ${url}`);
      } else {
        console.error("[Storage] Failed to delete image from Firebase storage:", e);
      }
    }
  } else if (url.includes('res.cloudinary.com')) {
    try {
      const parts = url.split('/');
      const publicIdWithExt = parts.slice(parts.indexOf('upload') + 2).join('/');
      let publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));
      if(!publicId) publicId = publicIdWithExt; // fallback if no extension
      
      const { getAiSettings } = await import('./gemini');
      const settings = getAiSettings();
      
      await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          publicId,
          cloudName: settings.cloudinaryCloudName,
          apiKey: settings.cloudinaryApiKey,
          apiSecret: settings.cloudinaryApiSecret
        })
      });
      console.log(`[Storage] Deleted Cloudinary image: ${url}`);
    } catch (e) {
      console.error("[Storage] Failed to delete from Cloudinary:", e);
    }
  }
}

