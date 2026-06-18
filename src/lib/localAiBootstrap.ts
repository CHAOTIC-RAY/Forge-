export type LocalAiBootstrapResult = {
  textReady: boolean;
  visionReady: boolean;
  visionSkipped: boolean;
};

/** Download and warm both local text and vision WebLLM engines when WebGPU is available. */
export async function ensureLocalAiEnginesReady(): Promise<LocalAiBootstrapResult> {
  const {
    ensureLocalTextEngineReady,
    canUseBuiltinWebGpuVision,
    ensureBuiltinVisionReady,
  } = await import('./gemini');

  await ensureLocalTextEngineReady();
  let visionReady = false;
  const visionSkipped = !canUseBuiltinWebGpuVision();
  if (!visionSkipped) {
    try {
      await ensureBuiltinVisionReady();
      visionReady = true;
    } catch (err) {
      console.warn('[ensureLocalAiEnginesReady] Vision preload failed:', err);
    }
  }
  return { textReady: true, visionReady, visionSkipped };
}
