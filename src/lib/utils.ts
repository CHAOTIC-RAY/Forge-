import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function createImageCollage(images: string[]): Promise<string> {
  if (!images || images.length === 0) return '';
  return images[0]; // Simple fallback
}

export function getAnalyticsSettings(): any {
  try {
    const saved = localStorage.getItem('forge_analytics_settings');
    return saved ? JSON.parse(saved) : { trackingEnabled: true, goals: [] };
  } catch (e) {
    return { trackingEnabled: true, goals: [] };
  }
}

export function setAnalyticsSettings(settings: any): void {
  try {
    localStorage.setItem('forge_analytics_settings', JSON.stringify(settings));
  } catch (e) {}
}
