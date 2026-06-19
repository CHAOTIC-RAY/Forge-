export type LocalAiBootstrapResult = {
  textReady: boolean;
  visionReady: boolean;
  visionSkipped: boolean;
};

/** Download and warm the local text WebLLM engine when WebGPU is available. Vision loads on demand. */
export async function ensureLocalAiEnginesReady(): Promise<LocalAiBootstrapResult> {
  const { ensureLocalTextEngineReady } = await import('./gemini');

  try {
    await ensureLocalTextEngineReady();
    return { textReady: true, visionReady: false, visionSkipped: true };
  } catch (err) {
    console.warn('[ensureLocalAiEnginesReady] Text preload failed:', err);
    return { textReady: false, visionReady: false, visionSkipped: true };
  }
}
