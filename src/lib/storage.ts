// Storage utility using Cloudinary via server proxy

/**
 * Uploads a base64 image string to Cloudinary via our server endpoint and returns the secure URL.
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

  try {
    console.log(`[Storage] Starting Cloudinary upload for path: ${path}`);
    const startTime = Date.now();

    // Convert base64 to Blob to send as multipart/form-data
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    const formData = new FormData();
    formData.append('image', blob, 'upload.png');

    const uploadResponse = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      let errorMessage = 'Failed to upload to Cloudinary';
      try {
        const errorData = await uploadResponse.json();
        console.error('[Storage] Server returned error JSON:', errorData);
        errorMessage = errorData.error?.message || errorData.error || errorData.details || errorMessage;
      } catch (e) {
        // If not JSON, get text (could be Cloudflare error page)
        try {
          const errorText = await uploadResponse.text();
          console.error('[Storage] Server returned error text:', errorText);
          if (errorText.includes('413 Request Entity Too Large')) {
            errorMessage = 'Image is too large for the current server configuration.';
          } else if (errorText.includes('524')) {
            errorMessage = 'Upload timed out. The image might be too large or the connection is slow.';
          } else {
            errorMessage = `Server error (${uploadResponse.status})`;
          }
        } catch (textErr) {
          errorMessage = `Upload failed with status ${uploadResponse.status}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await uploadResponse.json();
    const duration = Date.now() - startTime;
    console.log(`[Storage] Cloudinary upload completed in ${duration}ms: ${data.url}`);
    
    return data.url;
  } catch (e: any) {
    console.error('[Storage] Cloudinary upload failed:', e);
    throw e;
  }
}
