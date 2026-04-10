import React, { useState, useEffect } from 'react';
import { ForgeLoader } from './ForgeLoader';
import { Package, Download, Trash2, Image as ImageIcon, ClipboardPaste, X as CloseIcon, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { generateGenericJson, generateGenericText, getAi } from '../lib/gemini';
import { PRODUCT_CATEGORIES, OUTLETS, PriorityProduct, Business } from '../data';
import { Type } from '@google/genai';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, writeBatch } from 'firebase/firestore';

export function PriorityProductsPanel({ activeBusiness }: { activeBusiness?: Business | null }) {
  const [priorityProducts, setPriorityProducts] = useState<PriorityProduct[]>([]);
  const [isProcessingScreenshot, setIsProcessingScreenshot] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');
  const [isEnriching, setIsEnriching] = useState<string | null>(null);
  
  const userId = auth.currentUser?.uid;
  const businessId = activeBusiness?.id;

  // Sync priority products to Firestore
  useEffect(() => {
    if (!userId || !businessId) {
      const savedPriority = localStorage.getItem('rainbow_priority_products');
      if (savedPriority) {
        try {
          setPriorityProducts(JSON.parse(savedPriority));
        } catch (e) {
          console.error("Failed to parse priority products", e);
        }
      }
      return;
    }

    const q = query(collection(db, 'priority_products'), where('businessId', '==', businessId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products: PriorityProduct[] = [];
      snapshot.forEach((doc) => {
        products.push({ id: doc.id, ...doc.data() } as PriorityProduct);
      });
      setPriorityProducts(products);
    });

    return () => unsubscribe();
  }, [userId, businessId]);

  // Save to localStorage (only if not logged in or no business)
  useEffect(() => {
    if (!userId || !businessId) {
      localStorage.setItem('rainbow_priority_products', JSON.stringify(priorityProducts));
    }
  }, [priorityProducts, userId, businessId]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File;
    if (!file) return;

    setIsProcessingScreenshot(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = (event.target?.result as string).split(',')[1];
      
      try {
        const ai = getAi();
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: "Analyze this screenshot of a product list or inventory. Extract the product names and assign a priority (high, medium, or low) based on visual cues or stock levels if visible. Also try to extract SKU/Code, Category, and Price if available. Return a JSON array of objects with 'name', 'priority', 'notes', 'sku', 'category', and 'price' fields." },
                { inlineData: { data: base64Data, mimeType: file.type } }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                  notes: { type: Type.STRING },
                  sku: { type: Type.STRING },
                  category: { type: Type.STRING },
                  price: { type: Type.STRING }
                },
                required: ['name', 'priority']
              }
            }
          }
        });

        const extracted = JSON.parse(response.text || "[]");
        const newProducts = extracted.map((p: any) => ({
          ...p,
          id: Math.random().toString(36).substr(2, 9),
        }));

        if (userId && businessId) {
          const batch = writeBatch(db);
          newProducts.forEach((p: any) => {
            const docRef = doc(collection(db, 'priority_products'), p.id);
            batch.set(docRef, { ...p, userId, businessId, updatedAt: new Date().toISOString() });
          });
          await batch.commit();
        } else {
          setPriorityProducts(prev => [...newProducts, ...prev]);
        }
        toast.success(`Extracted ${newProducts.length} products from screenshot`);
      } catch (error) {
        console.error("AI Error:", error);
        toast.error("Failed to process screenshot with AI");
      } finally {
        setIsProcessingScreenshot(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addPriorityProduct = async () => {
    const newProduct: PriorityProduct = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      priority: 'medium'
    };
    
    if (userId && businessId) {
      try {
        await setDoc(doc(db, 'priority_products', newProduct.id), {
          ...newProduct,
          userId,
          businessId,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        toast.error("Failed to save to cloud");
      }
    } else {
      setPriorityProducts(prev => [newProduct, ...prev]);
    }
  };

  const handleBackupPriorityProducts = () => {
    if (priorityProducts.length === 0) {
      toast.error('No priority products to backup');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(priorityProducts, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `priority_products_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Priority products backed up successfully');
  };

  const updatePriorityProduct = async (id: string, updates: Partial<PriorityProduct>) => {
    if (userId && businessId) {
      try {
        await setDoc(doc(db, 'priority_products', id), {
          ...updates,
          userId,
          businessId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e) {
        console.error("Cloud sync failed", e);
      }
    } else {
      setPriorityProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  };

  const handleAiEnrich = async (product: PriorityProduct) => {
    if (!product.link) return;
    
    setIsEnriching(product.id);
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Extract product details from this URL: ${product.link}. 
        Return a JSON object with: name, category, price, sku, outlet.
        Available categories: ${PRODUCT_CATEGORIES.join(', ')}.
        Available outlets: ${OUTLETS.join(', ')}.
        Only return the JSON.`,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              price: { type: Type.STRING },
              sku: { type: Type.STRING },
              outlet: { type: Type.STRING }
            }
          }
        }
      });

      const enriched = JSON.parse(response.text || "{}");
      
      const updates: Partial<PriorityProduct> = {};
      if (enriched.name && !product.name) updates.name = enriched.name;
      if (enriched.category) updates.category = enriched.category;
      if (enriched.price) updates.price = enriched.price;
      if (enriched.sku) updates.sku = enriched.sku;
      if (enriched.outlet) updates.outlet = enriched.outlet;

      if (Object.keys(updates).length > 0) {
        await updatePriorityProduct(product.id, updates);
        toast.success("Product enriched with AI!");
      } else {
        toast.info("No new information found.");
      }
    } catch (e) {
      console.error("AI Enrichment failed:", e);
      toast.error("Failed to enrich product with AI.");
    } finally {
      setIsEnriching(null);
    }
  };

  const removePriorityProduct = async (id: string) => {
    if (userId && businessId) {
      try {
        await deleteDoc(doc(db, 'priority_products', id));
      } catch (e) {
        toast.error("Failed to delete from cloud");
      }
    } else {
      setPriorityProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const clearAllPriorityProducts = async () => {
    if (priorityProducts.length === 0 || !window.confirm('Clear all priority products?')) return;
    
    if (userId && businessId) {
      try {
        const batch = writeBatch(db);
        priorityProducts.forEach(p => {
          batch.delete(doc(db, 'priority_products', p.id));
        });
        await batch.commit();
        toast.success('Priority products cleared.');
      } catch (e) {
        toast.error("Failed to clear from cloud");
      }
    } else {
      setPriorityProducts([]);
      toast.success('Priority products cleared.');
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteContent.trim()) return;
    
    setIsProcessingScreenshot(true);
    try {
      const prompt = `Extract product names and priorities from this text/JSON: ${pasteContent}. Return a JSON array of objects with 'name' and 'priority' (high, medium, low).`;
      const extracted = await generateGenericJson(prompt);
      const newProducts = extracted.map((p: any) => ({
        ...p,
        id: Math.random().toString(36).substr(2, 9),
      }));

      if (userId && businessId) {
        const batch = writeBatch(db);
        newProducts.forEach((p: any) => {
          const docRef = doc(collection(db, 'priority_products'), p.id);
          batch.set(docRef, { ...p, userId, businessId, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
      } else {
        setPriorityProducts(prev => [...newProducts, ...prev]);
      }
      toast.success(`Extracted ${newProducts.length} products`);
      setPasteContent('');
      setIsPasteOpen(false);
    } catch (error) {
      console.error("AI Error:", error);
      toast.error("Failed to process text with AI");
    } finally {
      setIsProcessingScreenshot(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#191919] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2 text-[#37352F] dark:text-[#EBE9ED]">
            <Package className="w-5 h-5 text-purple-500" />
            Priority Products
          </h3>
          <p className="text-sm text-[#757681] dark:text-[#9B9A97]">AI will feature these items more frequently.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleBackupPriorityProducts}
            className="flex items-center justify-center w-10 h-10 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-[12px] transition-all hover:bg-[#EFEFED] "
            title="Backup Priority Products"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={clearAllPriorityProducts}
            className="flex items-center justify-center w-10 h-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-[12px] transition-all hover:bg-red-100 dark:hover:bg-red-900/20 "
            title="Clear All"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <label className={cn(
            "flex items-center justify-center w-10 h-10 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] cursor-pointer transition-all hover:bg-[#EFEFED] ",
            isProcessingScreenshot && "opacity-50 pointer-events-none"
          )} title="Screenshot to List">
            {isProcessingScreenshot ? <ForgeLoader size={20} /> : <ImageIcon className="w-5 h-5 text-[#37352F] dark:text-[#EBE9ED]" />}
            <input type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
          </label>
          <button 
            onClick={() => setIsPasteOpen(!isPasteOpen)}
            className={cn(
              "flex items-center justify-center w-10 h-10 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] transition-all hover:bg-[#EFEFED] ",
              isPasteOpen && "bg-purple-50 border-purple-200 text-purple-600"
            )}
            title="Paste Text/JSON"
          >
            <ClipboardPaste className="w-5 h-5 text-[#37352F] dark:text-[#EBE9ED]" />
          </button>
        </div>
      </div>

      {isPasteOpen && (
        <div className="mb-6 p-4 bg-[#F7F7F5] dark:bg-[#202020] rounded-[12px] border border-[#E9E9E7] dark:border-[#2E2E2E] ">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Paste Text or JSON</h4>
            <button onClick={() => setIsPasteOpen(false)} className="text-[#757681] hover:text-[#37352F]"><CloseIcon className="w-4 h-4" /></button>
          </div>
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder="Paste a list of products here..."
            className="w-full h-32 p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[8px] text-sm focus:outline-none focus:border-purple-500 resize-none mb-3"
          />
          <button
            onClick={handlePasteSubmit}
            disabled={isProcessingScreenshot || !pasteContent.trim()}
            className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-[8px] font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessingScreenshot ? <ForgeLoader size={16} /> : <ClipboardPaste className="w-4 h-4" />}
            Extract Products
          </button>
        </div>
      )}

      <div className="flex-1 space-y-3 pb-8">
        {priorityProducts.length === 0 && (
          <div className="text-center py-12 text-[#757681] dark:text-[#9B9A97] border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px]">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No priority products added.</p>
            <p className="text-xs mt-1">Add items manually or upload a screenshot.</p>
          </div>
        )}
        {priorityProducts.map(product => (
          <div key={product.id} className="group flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors ">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={product.name}
                onChange={(e) => updatePriorityProduct(product.id, { name: e.target.value })}
                placeholder="Product Name"
                className="w-full bg-transparent border-none focus:outline-none font-bold text-[#37352F] dark:text-[#EBE9ED] placeholder:text-[#9B9A97] dark:placeholder:text-[#7D7C78]"
              />
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <input
                  type="text"
                  value={product.link || ''}
                  onChange={(e) => updatePriorityProduct(product.id, { link: e.target.value })}
                  placeholder="URL (optional)"
                  className="text-xs bg-transparent border-none focus:outline-none text-blue-500 placeholder:text-[#9B9A97] dark:placeholder:text-[#7D7C78] w-32"
                />
                {product.link && (
                  <button 
                    onClick={() => handleAiEnrich(product)}
                    disabled={isEnriching === product.id}
                    className="text-[10px] bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    {isEnriching === product.id ? <ForgeLoader size={12} /> : <Sparkles className="w-3 h-3" />}
                    Enrich
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={product.priority}
                onChange={(e) => updatePriorityProduct(product.id, { priority: e.target.value as 'high' | 'medium' | 'low' })}
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-[8px] border-none focus:outline-none cursor-pointer appearance-none",
                  product.priority === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                  product.priority === 'medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                )}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button 
                onClick={() => removePriorityProduct(product.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-[8px] transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-90"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addPriorityProduct}
        className="mt-4 w-full py-3 border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] text-[#757681] dark:text-[#9B9A97] font-bold hover:border-purple-500 hover:text-purple-500 transition-colors flex items-center justify-center gap-2"
      >
        + Add Priority Product
      </button>
    </div>
  );
}
