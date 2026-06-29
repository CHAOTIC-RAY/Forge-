import { registerPlugin } from '@capacitor/core';
import { CookXpertLiteRtWeb } from './web';
import type { CookXpertLiteRtPlugin } from './definitions';

export * from './definitions';
export * from './runtime';

const CookXpertLiteRt = registerPlugin<CookXpertLiteRtPlugin>('CookXpertLiteRt', {
  web: () => new CookXpertLiteRtWeb(),
});

export { CookXpertLiteRt };
