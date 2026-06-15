import type * as OrtTypes from 'onnxruntime-web/webgpu';

const CACHE_NAME = 'forge-esrgan-models-v1';
const CUSTOM_DB = 'ForgeEsrganDB';
const CUSTOM_STORE = 'models';

export const DEFAULT_ESRGAN_MODEL = {
  id: '4x-nomos2-otf-esrgan',
  name: '4x Nomos2 OTF ESRGAN',
  scale: 4,
  /** Same-origin proxy — GitHub release assets block browser CORS */
  url: '/api/esrgan-model',
  sizeLabel: '32 MB',
  source: 'openmodeldb' as const,
};

/** Upstream ONNX (server/worker only) */
export const ESRGAN_DEFAULT_MODEL_UPSTREAM =
  'https://github.com/Phhofm/models/releases/download/4xNomos2_otf_esrgan/4xNomos2_otf_esrgan_fp16_opset17.onnx';

function resolveModelUrl(url: string): string {
  if (url.startsWith('/')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}${url}`;
  }
  return url;
}

export type EsrganModelRef = {
  id: string;
  name: string;
  scale: number;
  sizeLabel?: string;
  source: 'builtin' | 'custom';
};

export type EsrganLoadProgress = {
  progress: number;
  message: string;
};

export function detectScaleFromFilename(filename: string): number {
  const lower = filename.toLowerCase();
  const match = lower.match(/(?:^|[^0-9])([248])x(?:[^0-9]|$)/);
  if (match) return Number(match[1]);
  if (lower.includes('x8')) return 8;
  if (lower.includes('x2')) return 2;
  return 4;
}

export function imageDataToNchwTensor(imageData: ImageData, ort: typeof OrtTypes): OrtTypes.Tensor {
  const { width, height, data } = imageData;
  const floats = new Float32Array(3 * width * height);
  let p = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      floats[p++] = data[i] / 255;
      floats[p++] = data[i + 1] / 255;
      floats[p++] = data[i + 2] / 255;
    }
  }
  return new ort.Tensor('float32', floats, [1, 3, height, width]);
}

export function nchwTensorToImageData(tensor: OrtTypes.Tensor, width: number, height: number): ImageData {
  const data = tensor.data as Float32Array | Float16Array;
  const imageData = new ImageData(width, height);
  const channels = Math.max(1, Math.floor(data.length / (width * height)));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = y * width + x;
      const di = px * 4;
      const r = clampByte((data[px] ?? 0) * 255);
      const g = clampByte((data[width * height + px] ?? r) * 255);
      const b = clampByte((data[2 * width * height + px] ?? r) * 255);
      imageData.data[di] = channels >= 1 ? r : 0;
      imageData.data[di + 1] = channels >= 2 ? g : r;
      imageData.data[di + 2] = channels >= 3 ? b : r;
      imageData.data[di + 3] = 255;
    }
  }
  return imageData;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function openCustomDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(CUSTOM_DB, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CUSTOM_STORE)) {
        db.createObjectStore(CUSTOM_STORE, { keyPath: 'id' });
      }
    };
  });
}

async function readCustomModel(id: string): Promise<{ meta: EsrganModelRef; buffer: ArrayBuffer } | null> {
  const db = await openCustomDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOM_STORE, 'readonly');
    const req = tx.objectStore(CUSTOM_STORE).get(id);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const row = req.result as
        | { id: string; name: string; scale: number; buffer: ArrayBuffer; sizeLabel?: string }
        | undefined;
      if (!row) return resolve(null);
      resolve({
        meta: {
          id: row.id,
          name: row.name,
          scale: row.scale,
          sizeLabel: row.sizeLabel,
          source: 'custom',
        },
        buffer: row.buffer,
      });
    };
  });
}

async function writeCustomModel(row: {
  id: string;
  name: string;
  scale: number;
  buffer: ArrayBuffer;
  sizeLabel?: string;
}): Promise<EsrganModelRef> {
  const db = await openCustomDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CUSTOM_STORE, 'readwrite');
    const req = tx.objectStore(CUSTOM_STORE).put(row);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
  return {
    id: row.id,
    name: row.name,
    scale: row.scale,
    sizeLabel: row.sizeLabel,
    source: 'custom',
  };
}

async function fetchModelBuffer(
  url: string,
  onProgress?: (p: EsrganLoadProgress) => void
): Promise<ArrayBuffer> {
  const fetchUrl = resolveModelUrl(url);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(fetchUrl);
  if (cached) {
    onProgress?.({ progress: 100, message: 'Loaded model from cache' });
    return cached.arrayBuffer();
  }

  onProgress?.({ progress: 0, message: 'Downloading ESRGAN model…' });
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Model download failed (${res.status})`);

  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    await cache.put(fetchUrl, new Response(buf));
    onProgress?.({ progress: 100, message: 'Model ready' });
    return buf;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.({
      progress: Math.min(99, Math.round((received / total) * 100)),
      message: `Downloading model… ${Math.round((received / total) * 100)}%`,
    });
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  await cache.put(fetchUrl, new Response(merged));
  onProgress?.({ progress: 100, message: 'Model ready' });
  return merged.buffer;
}

class EsrganUpscalerService {
  private session: OrtTypes.InferenceSession | null = null;
  private ort: typeof OrtTypes | null = null;
  private activeModel: EsrganModelRef | null = null;
  private inputName = 'input';
  private outputName = 'output';
  private loading = false;

  get isLoading() {
    return this.loading;
  }

  get loadedModel() {
    return this.activeModel;
  }

  private async getOrt() {
    if (!this.ort) {
      this.ort = await import('onnxruntime-web/webgpu');
    }
    return this.ort;
  }

  async listModels(): Promise<EsrganModelRef[]> {
    const builtin: EsrganModelRef = {
      id: DEFAULT_ESRGAN_MODEL.id,
      name: DEFAULT_ESRGAN_MODEL.name,
      scale: DEFAULT_ESRGAN_MODEL.scale,
      sizeLabel: DEFAULT_ESRGAN_MODEL.sizeLabel,
      source: 'builtin',
    };

    const db = await openCustomDb();
    const custom = await new Promise<EsrganModelRef[]>((resolve, reject) => {
      const tx = db.transaction(CUSTOM_STORE, 'readonly');
      const req = tx.objectStore(CUSTOM_STORE).getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const rows = (req.result || []) as Array<{
          id: string;
          name: string;
          scale: number;
          sizeLabel?: string;
        }>;
        resolve(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            scale: r.scale,
            sizeLabel: r.sizeLabel,
            source: 'custom' as const,
          }))
        );
      };
    });

    return [builtin, ...custom];
  }

  async importCustomModel(file: File): Promise<EsrganModelRef> {
    if (!file.name.toLowerCase().endsWith('.onnx')) {
      throw new Error('Upload an .onnx ESRGAN model file.');
    }
    const buffer = await file.arrayBuffer();
    const id = `custom-${Date.now()}`;
    const scale = detectScaleFromFilename(file.name);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return writeCustomModel({
      id,
      name: file.name.replace(/\.onnx$/i, ''),
      scale,
      buffer,
      sizeLabel: `${sizeMb} MB`,
    });
  }

  async loadModel(
    modelId: string,
    onProgress?: (p: EsrganLoadProgress) => void
  ): Promise<EsrganModelRef> {
    if (this.activeModel?.id === modelId && this.session) return this.activeModel;
    this.loading = true;
    try {
      onProgress?.({ progress: 0, message: 'Initializing WebGPU…' });
      if (typeof navigator !== 'undefined' && !('gpu' in navigator && (navigator as Navigator & { gpu?: unknown }).gpu)) {
        throw new Error('WebGPU is not available in this browser.');
      }

      let buffer: ArrayBuffer;
      let meta: EsrganModelRef;

      if (modelId === DEFAULT_ESRGAN_MODEL.id) {
        meta = {
          id: DEFAULT_ESRGAN_MODEL.id,
          name: DEFAULT_ESRGAN_MODEL.name,
          scale: DEFAULT_ESRGAN_MODEL.scale,
          sizeLabel: DEFAULT_ESRGAN_MODEL.sizeLabel,
          source: 'builtin',
        };
        buffer = await fetchModelBuffer(DEFAULT_ESRGAN_MODEL.url, onProgress);
      } else {
        const custom = await readCustomModel(modelId);
        if (!custom) throw new Error('Custom model not found.');
        meta = custom.meta;
        buffer = custom.buffer;
        onProgress?.({ progress: 100, message: 'Loaded custom model' });
      }

      onProgress?.({ progress: 100, message: 'Compiling ONNX session…' });
      const ort = await this.getOrt();
      if (this.session) {
        await this.session.release();
        this.session = null;
      }

      this.session = await ort.InferenceSession.create(buffer, {
        executionProviders: ['webgpu'],
      });
      this.inputName = this.session.inputNames[0];
      this.outputName = this.session.outputNames[0];
      this.activeModel = meta;
      return meta;
    } finally {
      this.loading = false;
    }
  }

  async upscaleImage(
    source: CanvasImageSource,
    width: number,
    height: number,
    onTileProgress?: (pct: number) => void
  ): Promise<string> {
    if (!this.session || !this.activeModel) {
      throw new Error('Load an ESRGAN model first.');
    }
    const ort = await this.getOrt();

    const scale = this.activeModel.scale;
    const tileSize = 256;
    const tilePad = 10;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) throw new Error('Canvas not supported');
    srcCtx.drawImage(source, 0, 0, width, height);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = width * scale;
    outCanvas.height = height * scale;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) throw new Error('Canvas not supported');

    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });
    if (!tileCtx) throw new Error('Canvas not supported');

    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    let doneTiles = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const x = tx * tileSize;
        const y = ty * tileSize;
        const tileW = Math.min(tileSize, width - x);
        const tileH = Math.min(tileSize, height - y);

        const xStart = Math.max(x - tilePad, 0);
        const yStart = Math.max(y - tilePad, 0);
        const xEnd = Math.min(x + tileW + tilePad, width);
        const yEnd = Math.min(y + tileH + tilePad, height);
        const padW = xEnd - xStart;
        const padH = yEnd - yStart;

        tileCanvas.width = padW;
        tileCanvas.height = padH;
        tileCtx.clearRect(0, 0, padW, padH);
        tileCtx.drawImage(srcCanvas, -xStart, -yStart);

        const inputImage = tileCtx.getImageData(0, 0, padW, padH);
        const inputTensor = imageDataToNchwTensor(inputImage, ort);
        const feeds: Record<string, OrtTypes.Tensor> = { [this.inputName]: inputTensor };
        const results = await this.session.run(feeds);
        const output = results[this.outputName];
        const outW = padW * scale;
        const outH = padH * scale;
        const outImage = nchwTensorToImageData(output, outW, outH);

        const cropX = (x - xStart) * scale;
        const cropY = (y - yStart) * scale;
        const cropW = tileW * scale;
        const cropH = tileH * scale;

        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = outW;
        patchCanvas.height = outH;
        const patchCtx = patchCanvas.getContext('2d');
        patchCtx?.putImageData(outImage, 0, 0);
        outCtx.drawImage(patchCanvas, cropX, cropY, cropW, cropH, x * scale, y * scale, cropW, cropH);

        doneTiles += 1;
        onTileProgress?.(Math.round((doneTiles / (tilesX * tilesY)) * 100));
      }
    }

    return outCanvas.toDataURL('image/png');
  }
}

export const esrganUpscaler = new EsrganUpscalerService();
