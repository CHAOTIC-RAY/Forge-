import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, RefreshCw, AlertCircle, Cpu, Sparkles, HardDriveDownload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ForgeLoader } from './ForgeLoader';
import {
  DEFAULT_ESRGAN_MODEL,
  esrganUpscaler,
  type EsrganModelRef,
} from '../lib/esrganUpscaler';
import { cn } from '../lib/utils';

export function EsrganUpscaler() {
  const [models, setModels] = useState<EsrganModelRef[]>([]);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_ESRGAN_MODEL.id);
  const [modelReady, setModelReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadMessage, setLoadMessage] = useState('');
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaleProgress, setUpscaleProgress] = useState(0);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    esrganUpscaler.listModels().then(setModels).catch(console.error);
    void ensureModelLoaded().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureModelLoaded = async (modelId = selectedModelId) => {
    setIsLoadingModel(true);
    setError(null);
    try {
      await esrganUpscaler.loadModel(modelId, ({ progress, message }) => {
        setLoadProgress(progress);
        setLoadMessage(message);
      });
      setModelReady(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load model';
      setError(msg);
      setModelReady(false);
      throw e;
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError('Image is too large. Please use an image under 12MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        setSelectedImage(url);
        setResultImage(null);
        setError(null);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const imported = await esrganUpscaler.importCustomModel(file);
      const next = await esrganUpscaler.listModels();
      setModels(next);
      setSelectedModelId(imported.id);
      setModelReady(false);
      await ensureModelLoaded(imported.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to import model');
    } finally {
      e.target.value = '';
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage || !imageSize) return;
    setIsUpscaling(true);
    setUpscaleProgress(0);
    setError(null);
    try {
      if (!modelReady) await ensureModelLoaded();
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not read image'));
        img.src = selectedImage;
      });
      const out = await esrganUpscaler.upscaleImage(img, imageSize.w, imageSize.h, setUpscaleProgress);
      setResultImage(out);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upscaling failed');
    } finally {
      setIsUpscaling(false);
    }
  };

  const clear = () => {
    setSelectedImage(null);
    setImageSize(null);
    setResultImage(null);
    setError(null);
    setUpscaleProgress(0);
  };

  const activeModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#757681]">Model</label>
          <select
            value={selectedModelId}
            onChange={async (e) => {
              const id = e.target.value;
              setSelectedModelId(id);
              setModelReady(false);
              try {
                await ensureModelLoaded(id);
              } catch {
                /* surfaced via error state */
              }
            }}
            className="w-full px-3 py-2.5 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#202020] text-sm font-medium"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.scale}x{m.sizeLabel ? ` · ${m.sizeLabel}` : ''})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#757681]">Custom ONNX</label>
          <button
            type="button"
            onClick={() => modelInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] text-sm font-bold text-[#757681] hover:text-brand hover:border-brand/40 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload .onnx model
          </button>
          <input ref={modelInputRef} type="file" accept=".onnx" className="hidden" onChange={handleModelUpload} />
        </div>
      </div>

      {(isLoadingModel || !modelReady) && (
        <div className="p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] flex items-center gap-4">
          <ForgeLoader size={22} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">
              {isLoadingModel ? 'Downloading model…' : 'Model not loaded'}
            </p>
            <p className="text-xs text-[#757681] truncate">
              {loadMessage || DEFAULT_ESRGAN_MODEL.url}
              {loadProgress > 0 ? ` · ${loadProgress}%` : ''}
            </p>
          </div>
          {!isLoadingModel && !modelReady ? (
            <button
              type="button"
              onClick={() => void ensureModelLoaded()}
              className="ml-auto shrink-0 px-3 py-2 rounded-lg bg-brand text-white text-xs font-bold"
            >
              Download
            </button>
          ) : null}
        </div>
      )}

      {modelReady && activeModel ? (
        <div className="flex items-center gap-2 text-xs text-[#757681]">
          <Cpu className="w-3.5 h-3.5 text-emerald-500" />
          <span>
            WebGPU · {activeModel.name} · {activeModel.scale}x upscale
          </span>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {!selectedImage ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand/40 hover:bg-brand/5 transition-all flex flex-col items-center justify-center gap-3"
          >
            <div className="p-3 rounded-full bg-[#F7F7F5] dark:bg-[#202020]">
              <Upload className="w-6 h-6 text-[#757681]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Drop image or click to upload</p>
              <p className="text-xs text-[#757681] mt-1">PNG or JPG · max 12MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E] bg-black/20">
              <img src={resultImage || selectedImage} alt="Preview" className="w-full h-full object-contain" />
              {isUpscaling ? (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <ForgeLoader size={28} className="shrink-0" />
                  <p className="text-xs font-bold text-white/90">
                    Upscaling on WebGPU… {upscaleProgress > 0 ? `${upscaleProgress}%` : ''}
                  </p>
                </div>
              ) : null}
            </div>

            {error ? (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 flex items-center gap-2 text-red-500 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isUpscaling}
                onClick={clear}
                className="px-4 py-2.5 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] text-sm font-bold text-[#757681] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <button
                type="button"
                disabled={isUpscaling || !!resultImage || !modelReady}
                onClick={() => void handleUpscale()}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2',
                  'bg-brand text-white hover:bg-brand-hover disabled:opacity-50'
                )}
              >
                {isUpscaling ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
                {resultImage ? `Upscaled ${activeModel?.scale ?? 4}x` : `Upscale ${activeModel?.scale ?? 4}x`}
              </button>
            </div>

            {resultImage ? (
              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = resultImage;
                  link.download = `esrgan-${activeModel?.scale ?? 4}x.png`;
                  link.click();
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-brand/30 bg-brand/10 text-brand text-sm font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download result
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[10px] text-[#9B9A97] flex items-center gap-1.5">
        <HardDriveDownload className="w-3 h-3" />
        Default model:{' '}
        <a
          href="https://openmodeldb.info/models/4x-Nomos2-otf-esrgan"
          target="_blank"
          rel="noreferrer"
          className="text-brand hover:underline"
        >
          4x Nomos2 OTF ESRGAN
        </a>
        · runs fully on-device via WebGPU
      </p>
    </div>
  );
}

/** @deprecated Use EsrganUpscaler */
export const NanoBananaUpscaler = EsrganUpscaler;
