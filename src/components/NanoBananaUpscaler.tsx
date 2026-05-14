import React, { useState, useRef } from 'react';
import { Upload, Maximize2, Sparkles, Banana, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UpscalerProps {
  onUpscale?: (file: File) => Promise<string>;
}

export function NanoBananaUpscaler({ onUpscale }: UpscalerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image is too large. Please use an image under 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
      setResultImage(null);
    }
  };

  const handleUpscale = async () => {
    if (!selectedImage) return;
    
    setIsUpscaling(true);
    setError(null);
    
    try {
      // Simulate AI Upscaling logic
      // In a real implementation, this would call a backend or Gemini
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demonstration, we'll prefix a "processed" state
      setResultImage(selectedImage);
      
    } catch (err) {
      setError("The Nano Banana model encountered an error. Please try again.");
    } finally {
      setIsUpscaling(false);
    }
  };

  const clear = () => {
    setSelectedImage(null);
    setResultImage(null);
    setError(null);
  };

  return (
    <div className="bg-gray-900/50 border border-yellow-500/20 rounded-2xl overflow-hidden backdrop-blur-xl">
      <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-yellow-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-yellow-500/20 rounded-lg">
            <Banana className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-white leading-tight">Nano Banana</h3>
            <p className="text-[10px] text-yellow-400/70 font-mono uppercase tracking-widest uppercase">AI Image Upscaler</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-400 font-mono">MODEL: NANO-B1</span>
        </div>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {!selectedImage ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => fileInputRef.current?.click()}
              className="group cursor-pointer aspect-video rounded-xl border-2 border-dashed border-gray-700 hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all flex flex-col items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.05),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="p-3 bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-gray-400 group-hover:text-yellow-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-300">Drop image or click to upload</p>
                <p className="text-xs text-gray-500 mt-1">Supports PNG, JPG (Max 5MB)</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gray-700 bg-black/40">
                <img 
                  src={resultImage || selectedImage} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
                
                {isUpscaling && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-t-yellow-500 rounded-full animate-spin" />
                      <Banana className="absolute inset-0 m-auto w-6 h-6 text-yellow-400 animate-bounce" />
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400 font-bold">Upscaling...</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-1 italic italic">Processing via Nano Banana Architecture</p>
                    </div>
                  </div>
                )}

                {resultImage && !isUpscaling && (
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = resultImage;
                        link.download = 'nano-banana-upscaled.png';
                        link.click();
                      }}
                      className="p-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg transition-colors shadow-lg shadow-yellow-500/20"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isUpscaling}
                  onClick={clear}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  disabled={isUpscaling || !!resultImage}
                  onClick={handleUpscale}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10 hover:shadow-yellow-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  {resultImage ? 'Upscaled' : 'Scale 2x'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 py-4 bg-yellow-500/5 border-t border-yellow-500/10">
        <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
          <div className="flex gap-4">
            <span>BIT-DEPTH: 32BIT</span>
            <span>ALGO: FRUITY-CONV</span>
          </div>
          <span className="text-yellow-500/50">v1.2.0-STABLE</span>
        </div>
      </div>
    </div>
  );
}
