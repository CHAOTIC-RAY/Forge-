import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * <img> props for hosted media. Public CDNs (Cloudinary, Firebase) are loaded without
 * crossOrigin so the browser does not require CORS on GET (which can break thumbnails
 * and guest/shared calendar views). Referrer is preserved for Cloudinary delivery restrictions.
 */
export function getTrustedCdnImageElementProps(url: string): {
  crossOrigin?: 'anonymous';
  referrerPolicy?: 'no-referrer' | 'strict-origin-when-cross-origin';
} {
  if (url.includes('cloudinary.com') || url.includes('firebasestorage.googleapis.com')) {
    return { referrerPolicy: 'strict-origin-when-cross-origin' };
  }
  return { crossOrigin: 'anonymous', referrerPolicy: 'no-referrer' };
}

/** When the document is crossOriginIsolated, cross-origin CDN <img> URLs are blocked; same-origin proxy works. */
export function getCalendarImageDisplayUrl(url: string): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.includes('localhost') || url.includes('127.0.0.1')) {
    return url;
  }
  const isolated =
    typeof globalThis !== 'undefined' &&
    (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true;
  const isCdn = url.includes('cloudinary.com') || url.includes('firebasestorage.googleapis.com');
  if (isolated && isCdn) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  if (isCdn) return url;
  if (url.startsWith('http')) return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  return url;
}

export interface AnalyticsSettings {
  instagramUrl: string;
  facebookUrl: string;
  autoRunAnalytics: boolean;
  lastRunDate?: string;
  targetPlatforms: string[];
}

export const getAnalyticsSettings = (): AnalyticsSettings => {
  const stored = localStorage.getItem('rainbow_analytics_settings');
  if (stored) {
    try {
      const settings = JSON.parse(stored);
      if (!settings.targetPlatforms) {
        settings.targetPlatforms = ['instagram', 'facebook', 'viber', 'tiktok'];
      }
      return settings;
    } catch (e) {
      console.error("Failed to parse analytics settings", e);
    }
  }
  return {
    instagramUrl: '',
    facebookUrl: '',
    autoRunAnalytics: true,
    targetPlatforms: ['instagram', 'facebook', 'viber', 'tiktok'],
  };
};

export const setAnalyticsSettings = (settings: AnalyticsSettings) => {
  localStorage.setItem('rainbow_analytics_settings', JSON.stringify(settings));
};

export const readFileAsDataURL = (file: File): Promise<{ dataUrl: string, isVideo: boolean }> => {
  return new Promise((resolve, reject) => {
    const isVideo = file.type.startsWith('video/');
    // If it's a video, extract multiple frames and create a collage
    if (isVideo) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const url = URL.createObjectURL(file);
      video.src = url;
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const frameCount = 4; // Extract 4 frames for a 2x2 collage
        const frames: string[] = [];
        let framesCaptured = 0;

        const captureFrame = (time: number) => {
          video.currentTime = time;
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const MAX_HEIGHT = 400;
          let width = video.videoWidth;
          let height = video.videoHeight;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(video, 0, 0, width, height);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
            framesCaptured++;

            if (framesCaptured < frameCount) {
              captureFrame((duration / (frameCount + 1)) * (framesCaptured + 1));
            } else {
              createImageCollage(frames).then(dataUrl => resolve({ dataUrl, isVideo })).catch(reject).finally(() => {
                URL.revokeObjectURL(url);
              });
            }
          } else {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to get canvas context"));
          }
        };

        captureFrame(duration / (frameCount + 1));
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video"));
      };
      return;
    }

    // Handle images
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.6), isVideo: false });
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const createImageCollage = async (base64Array: string[]): Promise<string> => {
  if (base64Array.length === 1) return base64Array[0];
  
  const images = await Promise.all(base64Array.map(src => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }));

  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  const CELL_SIZE = 600;

  const canvas = document.createElement('canvas');
  canvas.width = cols * CELL_SIZE;
  canvas.height = rows * CELL_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return base64Array[0];

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const scale = Math.max(CELL_SIZE / img.width, CELL_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = col * CELL_SIZE + (CELL_SIZE - w) / 2;
    const y = row * CELL_SIZE + (CELL_SIZE - h) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.clip();
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.8);
};
