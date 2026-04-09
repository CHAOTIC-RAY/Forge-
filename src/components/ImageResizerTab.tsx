import React, { useState, useRef } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { Image as ImageIcon, Download, Upload, Maximize } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

const PLATFORMS = [
  { name: 'Instagram Square', width: 1080, height: 1080, ratio: '1:1' },
  { name: 'Instagram Story / Reels', width: 1080, height: 1920, ratio: '9:16' },
  { name: 'Instagram Portrait', width: 1080, height: 1350, ratio: '4:5' },
  { name: 'Facebook Post', width: 1200, height: 630, ratio: '1.91:1' },
  { name: 'Twitter Post', width: 1200, height: 675, ratio: '16:9' },
  { name: 'LinkedIn Banner', width: 1584, height: 396, ratio: '4:1' },
];

export function ImageResizerTab() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resizedImages, setResizedImages] = useState<{ name: string; url: string; width: number; height: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSourceImage(reader.result as string);
      setResizedImages([]); // Reset when new image uploaded
    };
    reader.readAsDataURL(file);
  };

  const processImages = async () => {
    if (!sourceImage || !canvasRef.current) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.src = sourceImage;
      await new Promise((resolve) => { img.onload = resolve; });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const results = [];

      for (const platform of PLATFORMS) {
        canvas.width = platform.width;
        canvas.height = platform.height;

        // Calculate scaling to cover the canvas (object-fit: cover logic)
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;

        // Fill background with white (or blur in a more advanced version)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        results.push({
          name: platform.name,
          url: dataUrl,
          width: platform.width,
          height: platform.height
        });
      }

      setResizedImages(results);
      toast.success('Images resized successfully!');
    } catch (error) {
      console.error('Resize failed:', error);
      toast.error('Failed to resize images.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_').toLowerCase()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAll = () => {
    resizedImages.forEach(img => downloadImage(img.url, img.name));
    toast.success('Downloading all images...');
  };

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Image Resizer</h3>
            <p className="text-xs text-[#787774]">Auto-resize one image to all platform-specific dimensions.</p>
          </div>
          {resizedImages.length > 0 && (
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download All
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        <div className="bg-[#F7F7F5] dark:bg-[#202020] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E]">
          {!sourceImage ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-xl cursor-pointer hover:bg-white dark:hover:bg-[#191919] transition-colors bg-white dark:bg-[#191919]">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-[#787774] dark:text-[#9B9A97] mb-2" />
                <p className="mb-1 text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">Click to upload or drag and drop</p>
                <p className="text-[10px] font-bold text-[#787774] dark:text-[#9B9A97]">PNG, JPG or WEBP (MAX. 10MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 items-start">
                <div className="relative w-full aspect-square bg-white dark:bg-[#191919] rounded-lg overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <img src={sourceImage} alt="Source" className="w-full h-full object-contain p-2" />
                  <button
                    onClick={() => { setSourceImage(null); setResizedImages([]); }}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-black/50 backdrop-blur-sm rounded-md text-[10px] font-bold hover:bg-white dark:hover:bg-black transition-colors"
                  >
                    Change Image
                  </button>
                </div>
                <div className="w-full space-y-3">
                  <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Ready to Resize</h4>
                  <p className="text-xs font-bold text-[#787774] dark:text-[#9B9A97]">
                    We will automatically crop and scale your image to fit the following formats:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map(p => (
                      <span key={p.name} className="px-2 py-1 bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#EBE9ED] text-[10px] font-bold rounded-md border border-[#E9E9E7] dark:border-[#2E2E2E]">
                        {p.name} ({p.ratio})
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={processImages}
                    disabled={isProcessing}
                    className="mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full"
                  >
                    {isProcessing ? <ForgeLoader size={16} /> : <Maximize className="w-4 h-4" />}
                    {isProcessing ? 'Processing...' : 'Auto-Resize Image'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {resizedImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {resizedImages.map((img, idx) => (
              <div key={idx} className="bg-[#F7F7F5] dark:bg-[#202020] p-3 rounded-xl border border-[#E9E9E7] dark:border-[#2E2E2E] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-bold text-[#37352F] dark:text-[#EBE9ED] text-[10px] truncate pr-2">{img.name}</h5>
                  <span className="text-[9px] font-bold text-[#787774] dark:text-[#9B9A97] shrink-0">{img.width}×{img.height}</span>
                </div>
                <div className="flex-1 bg-white dark:bg-[#191919] rounded-lg overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E] flex items-center justify-center p-1.5 mb-3">
                  <img 
                    src={img.url} 
                    alt={img.name} 
                    className="max-w-full max-h-24 object-contain"
                  />
                </div>
                <button
                  onClick={() => downloadImage(img.url, img.name)}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E] transition-colors text-[10px] font-bold"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
