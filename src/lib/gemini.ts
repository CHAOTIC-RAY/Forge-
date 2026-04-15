import { GoogleGenAI, Type } from '@google/genai';
import { getGenerativeModel } from 'firebase/vertexai';
import { vertexAI, auth, db } from './firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { Post, Business } from '../data';
import { getIndustryConfig } from './industryConfig';

declare const puter: any;

let serverConfig: { geminiApiKey?: string; groqApiKey?: string } | null = null;

let isFetchingConfig = false;

export const fetchServerConfig = async () => {
  if (isFetchingConfig) return;
  isFetchingConfig = true;
  
  try {
    const response = await fetch('/api/config');
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (text.includes('<!doctype html>') || text.includes('<!DOCTYPE html>')) {
        console.warn('[AI Config] API route returned HTML fallback (truncated):', text.substring(0, 200));
        return;
      }
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const data = await response.json();
    if (data && typeof data === 'object') {
      serverConfig = data;
      console.log('[AI Config] Server configuration loaded successfully.');
    }
  } catch (error) {
    console.error('[AI Config] Failed to fetch server config:', error);
  } finally {
    isFetchingConfig = false;
  }
};

// Initial fetch
if (typeof window !== 'undefined') {
  fetchServerConfig();
}

export const isGeminiKeyAvailable = () => {
  const settings = getAiSettings();
  const apiKey = settings.geminiApiKey || 
                 serverConfig?.geminiApiKey ||
                 (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
                 (import.meta.env && (import.meta.env as any).VITE_GEMINI_API_KEY);
  
  return !!apiKey && apiKey !== 'undefined';
};

export const getAi = () => {
  const settings = getAiSettings();
  // Prioritize settings, then serverConfig, then process.env (Vite defined), then import.meta.env
  let apiKey = settings.geminiApiKey || 
               serverConfig?.geminiApiKey ||
               (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || 
               (import.meta.env && (import.meta.env as any).VITE_GEMINI_API_KEY) || 
               '';
  
  // Handle the case where Vite might have stringified 'undefined' or it's otherwise invalid
  if (apiKey === 'undefined' || !apiKey) {
    apiKey = 'missing_api_key';
  }
  
  // If we still don't have a key, we'll return the instance but it might fail later.
  // However, we want to avoid the "An API Key must be set when running in a browser" 
  // error during instantiation if possible, though the SDK usually throws it.
  return new GoogleGenAI({ apiKey });
};

const getVertexModel = (modelName: string) => {
  return getGenerativeModel(vertexAI, { model: modelName });
};

const GROQ_API_KEY = (typeof process !== 'undefined' && process.env?.GROQ_API_KEY) || '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';

export const GEMINI_MODELS = [
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Latest)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-flash-latest', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image (Nano 2)' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Nano)' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image' },
];

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  { id: 'llama-3.2-11b-vision-preview', name: 'Llama 3.2 11B Vision' },
  { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90B Vision' },
];

export const safeParseJSON = (text: string) => {
  try {
    let cleaned = text.trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

export const safeParseJSONArray = (text: string) => {
  try {
    let cleaned = text.trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
};

// --- Simple In-Memory Context Cache ---
// This caches AI responses based on the prompt/contents to save cost and speed up repeated queries.
const aiCache = new Map<string, { response: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export function getCachedResponse(cacheKey: string) {
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[AI Cache] Hit for key: ${cacheKey.substring(0, 50)}...`);
    return cached.response;
  }
  return null;
}

export function setCachedResponse(cacheKey: string, response: any) {
  aiCache.set(cacheKey, { response, timestamp: Date.now() });
}

export function generateCacheKey(model: string, contents: any, config?: any) {
  return JSON.stringify({ model, contents, config });
}
// --------------------------------------

export async function fetchBrandKitDesignGuide(businessId: string): Promise<string> {
  try {
    const docRef = doc(db, 'brand_kits', businessId);
    const docSnap = await getDocs(query(collection(db, 'brand_kits'), where('__name__', '==', businessId)));
    
    if (!docSnap.empty) {
      const data = docSnap.docs[0].data();
      return data.designGuide || '';
    }
  } catch (error) {
    console.error("Error fetching design guide:", error);
  }
  return '';
}

export const getAiSettings = () => {
  const saved = localStorage.getItem('forge_ai_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure targetUrl exists in saved settings
      if (!parsed.targetUrl) {
        parsed.targetUrl = '';
      }
      if (!parsed.imageProvider) {
        parsed.imageProvider = 'gemini';
      }
      if (!parsed.pollinationModel) {
        parsed.pollinationModel = 'flux';
      }
      if (!parsed.pollinationApiKey) {
        parsed.pollinationApiKey = '';
      }
      if (!parsed.puterTextModel) {
        parsed.puterTextModel = 'gpt-4o-mini';
      }
      if (!parsed.puterImageModel) {
        parsed.puterImageModel = 'dall-e-3';
      }
      return parsed;
    } catch (e) {}
  }
  return {
    preferredProvider: 'groq',
    imageProvider: 'gemini',
    geminiModel: 'gemini-2.5-flash',
    groqModel: 'llama-3.3-70b-versatile',
    groqVisionModel: 'llama-3.2-11b-vision-preview',
    pollinationModel: 'flux',
    pollinationApiKey: '',
    puterTextModel: 'gpt-4o-mini',
    puterImageModel: 'dall-e-3',
    targetUrl: '',
    geminiApiKey: '',
    groqApiKey: '',
    firecrawlApiKey: '',
    systemInstructions: ''
  };
};

export const setAiSettings = (settings: any) => {
  localStorage.setItem('forge_ai_settings', JSON.stringify(settings));
};

async function fetchFromPuter(prompt: string, images?: { base64: string, mimeType: string }[]) {
  const settings = getAiSettings();
  const model = settings.puterTextModel || 'gpt-4o-mini';
  
  // Ensure puter is available
  const puterInstance = (window as any).puter;
  if (!puterInstance) {
    console.error("[Puter] Puter.js is not loaded on window.");
    throw new Error("Puter.js is not loaded yet. Please refresh the page.");
  }

  try {
    // Check if signed in
    const isSignedIn = await puterInstance.auth.isSignedIn();
    if (!isSignedIn) {
      console.warn("[Puter] User is not signed in to Puter.js");
      throw new Error("Please sign in to Puter.js in Settings to use this AI provider.");
    }

    let response: any;
    console.log(`[Puter] Calling model ${model} with prompt:`, prompt.substring(0, 100) + "...");
    
    const messages: any[] = [];
    
    const fullPrompt = settings.systemInstructions 
      ? `System Instructions:\n${settings.systemInstructions}\n\nUser Request:\n${prompt}`
      : prompt;

    if (images && images.length > 0) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: fullPrompt },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
          }))
        ]
      });
      console.log("[Puter] Sending messages with images:", messages);
      response = await puterInstance.ai.chat(messages, { model });
    } else {
      messages.push({ role: 'user', content: fullPrompt });
      console.log("[Puter] Sending text-only messages:", messages);
      response = await puterInstance.ai.chat(messages, { model });
    }
    
    console.log("[Puter] Raw response:", response);

    // Puter.js v2 chat response handling
    if (typeof response === 'string') return response;
    
    // Check for response.message.content (standard OpenAI-like)
    if (response?.message?.content) {
      if (typeof response.message.content === 'string') return response.message.content;
      if (Array.isArray(response.message.content)) {
        return response.message.content.map((c: any) => c.text || '').join('');
      }
    }
    
    // Check for response.text (common in some Puter versions)
    if (response?.text) return response.text;

    // Check for choices (OpenAI style)
    if (response?.choices?.[0]?.message?.content) return response.choices[0].message.content;
    if (response?.choices?.[0]?.text) return response.choices[0].text;
    
    // If it's an object with a toString that isn't [object Object]
    const str = String(response);
    if (str !== '[object Object]') return str;

    // Fallback: try to find any string property that looks like content
    if (typeof response === 'object' && response !== null) {
      return response.content || response.result || response.output || JSON.stringify(response);
    }

    return str;
  } catch (error: any) {
    console.error("[Puter] Error in fetchFromPuter:", error);
    throw error;
  }
}

export async function generateTextWithCascade(prompt: string, expectJson: boolean = false, businessId?: string): Promise<string> {
  const settings = getAiSettings();
  
  let designContext = '';
  if (businessId) {
    const guide = await fetchBrandKitDesignGuide(businessId);
    if (guide) {
      designContext = `\n\nDESIGN GUIDE & STYLE REFERENCE:\n${guide}\nRefer to the above guide for style, tone, and formatting consistency.\n`;
    }
  }

  const fullPrompt = expectJson ? prompt + designContext + "\n\nYou MUST return ONLY a valid JSON object or array." : prompt + designContext;

  if (settings.preferredProvider === 'puter') {
    try {
      const resp = await fetchFromPuter(fullPrompt);
      if (resp) return resp;
    } catch (e) {
      console.warn('Puter failed, cascading...');
    }
  } else if (settings.preferredProvider === 'groq') {
    try {
      const resp = await fetchFromGroq(fullPrompt);
      if (resp) return resp;
    } catch (e) {
      console.warn('Groq failed, cascading...');
    }
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  try {
    const ai = getAi();
    const config: any = { temperature: 0.7 };
    if (expectJson) {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model: settings.geminiModel || "gemini-2.5-flash",
      contents: fullPrompt,
      config
    });
    
    if (response.text) {
      return response.text;
    } else if (response.candidates?.[0]?.content?.parts) {
      return response.candidates[0].content.parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
    }
    return '';
  } catch (error) {
    console.warn("Gemini failed, cascading fallback...");
  }

  try {
    return await fetchFromGroq(fullPrompt);
  } catch (e) {
    throw new Error("All AI providers failed to generate text.");
  }
}

async function fetchFromGroq(prompt: string, images?: { base64: string, mimeType: string }[]) {
  const settings = getAiSettings();
  
  if (!settings.groqApiKey && !serverConfig?.groqApiKey && !GROQ_API_KEY) {
    await fetchServerConfig();
  }
  
  const apiKey = settings.groqApiKey || serverConfig?.groqApiKey || GROQ_API_KEY;
  const messages: any[] = [];
  
  if (settings.systemInstructions) {
    messages.push({ role: 'system', content: settings.systemInstructions });
  }

  let content: string | any[] = prompt;

  if (images && images.length > 0) {
    content = [{ type: 'text', text: prompt }];
    for (const img of images) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
        }
      });
    }
  }

  messages.push({ role: 'user', content });

  const isJsonExpected = prompt.toLowerCase().includes('json');
  const body: any = {
    model: images && images.length > 0 ? settings.groqVisionModel : settings.groqModel,
    messages,
    temperature: 0.7,
  };

  if (isJsonExpected) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function generatePostContent(outlet: string, productCategory?: string, previousTitle?: string, business?: Business) {
  const settings = getAiSettings();
  const category = productCategory || "All Products";
  const businessContext = business ? `\nBUSINESS CONTEXT: This post is for "${business.name}", which operates in the "${business.industry}" industry.` : 'This post is for a professional business.';
  
  // Fetch real products from our Google Search Engine scraper first
  const { products } = await scrapeWooCommerce(category, undefined, business?.targetUrl);
  const productContext = products.length > 0 
    ? `\nHere are some REAL products currently in stock for this category:\n${products.slice(0, 10).map(p => `- ${p.title} (${p.stockInfo})`).join('\n')}`
    : '';

  const categoryPrompt = productCategory ? ` specifically in the category "${productCategory}"` : '';
  const avoidPrompt = previousTitle ? `\nCRITICAL: DO NOT generate a post about "${previousTitle}". You MUST choose a completely DIFFERENT brand, product type, or theme.` : '';
  const randomSeed = Math.floor(Math.random() * 1000000);
  
  // Provide a list of random angles to force variety
  const angles = [
    "a specific popular brand",
    "a seasonal collection",
    "new arrivals",
    "premium/luxury items",
    "budget-friendly essentials",
    "a specific room or use-case (e.g., kitchen, outdoor, bathroom)",
    "color-coordinated items",
    "a specific material (e.g., wooden, metallic, glass)"
  ];
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];

  const safeOutlet = outlet.length > 2000 ? outlet.substring(0, 2000) + "..." : outlet;
  const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';

  let designContext = '';
  if (business?.id) {
    const guide = await fetchBrandKitDesignGuide(business.id);
    if (guide) {
      designContext = `\n\nDESIGN GUIDE & STYLE REFERENCE (Follow this style closely):\n${guide}\n`;
    }
  }

  const prompt = `Create a cohesive social media carousel post.
    ${businessContext}
    ${designContext}
    Outlet: "${safeOutlet}"${categoryPrompt}. 
    ${productContext}
    ${systemInstruction}
    
    CRITICAL: Focus ONLY on products that are currently IN STOCK.${avoidPrompt}
    
    IMPORTANT: Do not just mix random products. The products MUST follow ONE of these cohesive themes:
    1. A series of products from the SAME BRAND.
    2. A series of products of the SAME PRODUCT TYPE (e.g., all sofas, all power drills).
    3. A series of products that can be USED TOGETHER (e.g., a complete bathroom set, a matching dining set).
    4. A series of products with the SAME COLOR or a matching aesthetic.
    
    To ensure variety, please focus your search and selection on this specific angle: "${randomAngle}".
    (Randomization seed: ${randomSeed})
    
    Create a cohesive social media carousel post featuring these products (maximum 8 slides/products).
    You MUST return ONLY a valid JSON object with no markdown formatting, no backticks, and no extra text.
    The JSON object must have exactly these fields:
    - title: A short, catchy title for the carousel post indicating the theme
    - brief: Visual instructions for the graphic designer (e.g., "Slide 1: Intro, Slide 2: Product A, Slide 3: Product B... up to 8 slides")
    - caption: A SHORT, engaging Instagram/Facebook caption (max 2-3 sentences) with emojis, mentioning the featured products and their cohesive theme
    - hashtags: Space-separated hashtags`;

  const safeParseJSON = (text: string) => {
    try {
      let cleaned = text.trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleaned = cleaned.substring(start, end + 1);
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  };

  // Hierarchy 0: Puter.js (if preferred)
  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON object with fields: title, brief, caption, hashtags.");
      const parsed = safeParseJSON(puterResponse || '{}');
      if (parsed && parsed.title) return parsed;
    } catch (error) {
      console.warn("Puter.js failed. Cascading to Gemini...");
    }
  } else if (settings.preferredProvider === 'groq') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON object with fields: title, brief, caption, hashtags.");
      const parsed = safeParseJSON(groqResponse || '{}');
      if (parsed && parsed.title) return parsed;
    } catch (error) {
      console.warn("Groq failed. Cascading to Gemini...");
    }
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  // Hierarchy 1: Gemini Public API
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            brief: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: { type: Type.STRING }
          },
          required: ["title", "brief", "caption", "hashtags"]
        }
      }
    });
    
    let text = '';
    if (response.candidates?.[0]?.content?.parts) {
      text = response.candidates[0].content.parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
    } else {
      text = response.text || '{}';
    }
    const parsed = safeParseJSON(text);
    if (parsed) return parsed;
  } catch (error) {
    console.warn("Gemini Native API failed. Cascading to Groq...");
  }

  // Hierarchy 2: Groq Public API
  try {
    const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON object.");
    const parsed = safeParseJSON(groqResponse || '{}');
    if (parsed) return parsed;
  } catch (error) {
    console.warn("Groq API failed. Cascading to Firebase Vertex AI...");
  }

  // Hierarchy 3: Firebase Vertex AI
  try {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parsed = safeParseJSON(response.text() || '{}');
    if (parsed) return parsed;
  } catch (error) {
    console.error("Firebase Vertex AI totally failed.", error);
  }

  // Hierarchy 4: Graceful UI Rejection
  throw new Error("All AI providers (Gemini, Groq, Firebase) failed to generate content or timed out. Please try again later.");
}

export async function generateMockupImage(title: string, brief: string, caption: string, referenceImageBase64?: string, business?: Business): Promise<{ url: string, provider: string }> {
  const settings = getAiSettings();
  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }
  const ai = getAi();
  
  // Fetch brand kit
  let brandContext = "Use brand colors like orange, blue, and white.";
  let brandDesigns: any[] = [];
  let designGuide = '';
  
  if (business?.id) {
    designGuide = await fetchBrandKitDesignGuide(business.id);
  }

  try {
    const savedBrandKit = localStorage.getItem('brandKit');
    if (savedBrandKit) {
      const brandKit = JSON.parse(savedBrandKit);
      if (brandKit.colors && brandKit.colors.length > 0) {
        const colors = brandKit.colors.map((c: any) => `${c.name} (${c.hex})`).join(', ');
        brandContext = `Use these exact brand colors: ${colors}.`;
      }
      if (brandKit.fonts) {
        brandContext += ` Use ${brandKit.fonts.heading} for headings and ${brandKit.fonts.body} for body text.`;
      }
      if (brandKit.designs && brandKit.designs.length > 0) {
        brandContext += ` Match the visual style, layout, and design language of the provided reference designs.`;
        brandDesigns = brandKit.designs;
      }
    }
  } catch (e) {
    console.error('Failed to load brand kit', e);
  }

  const style = `vibrant promotional graphic, clean product photography on realistic backgrounds, modern layout, high-end professional ad. ${brandContext} ${designGuide ? `\nDESIGN GUIDE:\n${designGuide}` : ''}`;
  const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';

  const prompt = `A professional social media promotional graphic for ${business?.name || 'Forge Enterprises'}, a leading business in the ${business?.industry || 'retail'} industry.
  Text on image: "${title}".
  Visual instructions: ${brief}.
  Context: ${caption}.
  Style: ${style}. ${systemInstruction}`;

  if (settings.imageProvider === 'pollination') {
    const encodedPrompt = encodeURIComponent(prompt);
    const model = settings.pollinationModel || 'flux';
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=${model}`;
    
    const headers: Record<string, string> = {};
    if (settings.pollinationApiKey) {
      headers['Authorization'] = `Bearer ${settings.pollinationApiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Failed to generate image with Pollination.ai");
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { url: base64, provider: 'Pollination.ai' };
  }

  if (settings.imageProvider === 'puter') {
    const model = settings.puterImageModel || 'dall-e-3';
    const image = await puter.ai.txt2img(prompt, { model });
    return { url: image.src, provider: 'Puter.js' };
  }

  const parts: any[] = [{ text: prompt }];

  if (referenceImageBase64) {
    // Extract mime type and base64 data from data URL
    const match = referenceImageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  // Add brand designs
  for (const design of brandDesigns) {
    const match = design.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  }

  if (getAiSettings().preferredProvider === 'firebase') {
    const model = getVertexModel('gemini-2.5-flash-image');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
    });
    const response = await result.response;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, provider: 'Gemini' };
      }
    }
  } else {
    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, provider: 'Gemini' };
      }
    }
  }
  throw new Error("No image generated");
}

export async function generateSmartBrief(title: string, recentPosts: Post[], business?: Business): Promise<string> {
  const recentContext = recentPosts.slice(0, 3).map(p => `- ${p.title}: ${p.brief}`).join('\n');
  const settings = getAiSettings();
  const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';
  
  let designGuide = '';
  if (business?.id) {
    designGuide = await fetchBrandKitDesignGuide(business.id);
  }

  const prompt = `Generate a detailed graphic design brief for a social media post titled "${title}".
  
  ${designGuide ? `\nDESIGN GUIDE & STYLE REFERENCE:\n${designGuide}\n` : ''}
  
  Context from recent posts:
  ${recentContext}
  ${systemInstruction}
  
  The brief should include:
  1. Visual Style (Design language based on recent posts and design guide)
  2. Color Palette (Complementary to brand)
  3. Key Elements (What must be in the image)
  4. Typography suggestions
  5. Composition instructions
  
  Keep it professional and concise for an AI image generator or a designer.`;

  const cacheKey = generateCacheKey("gemini-2.5-flash", prompt);
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached.text;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt);
      if (puterResponse) {
        setCachedResponse(cacheKey, { text: puterResponse });
        return puterResponse;
      }
    } catch (error) {
      console.warn("Puter failed for smart brief, falling back:", error);
    }
  } else if (settings.preferredProvider === 'groq') {
    try {
      const groqResponse = await fetchFromGroq(prompt);
      if (groqResponse) {
        setCachedResponse(cacheKey, { text: groqResponse });
        return groqResponse;
      }
    } catch (error) {
      console.warn("Groq failed for smart brief, falling back:", error);
    }
  }

  const text = await generateTextWithCascade(prompt, false);
  setCachedResponse(cacheKey, { text: text || '' });
  return text || '';
}

export async function generateSmartPost(title: string, category: string, outlet: string, type: string, link: string, localDB: any[], mode: 'product' | 'info' = 'product', business?: Business): Promise<Partial<Post>> {
  const dbContext = localDB.slice(0, 5).map(p => `- ${p.title}: ${p.type} (${mode === 'product' ? (p.price || 'N/A') : (p.stockInfo || 'N/A')})`).join('\n');
  const settings = getAiSettings();
  const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';
  
  let designGuide = '';
  if (business?.id) {
    designGuide = await fetchBrandKitDesignGuide(business.id);
  }

  const prompt = `Generate a social media post based on the following information:
  Title: ${title}
  Category: ${category}
  Outlet: ${outlet}
  Type: ${type}
  Link/Reference: ${link}
  ${systemInstruction}
  
  ${designGuide ? `\nDESIGN GUIDE & STYLE REFERENCE:\n${designGuide}\n` : ''}
  
  Local Database Context (Recent/Related ${mode === 'product' ? 'Products' : 'Information Pieces'}):
  ${dbContext}
  
  CRITICAL: This is for a ${mode === 'product' ? 'Product-based' : 'Knowledge-based'} business.
  - If Product-based: Focus on sales, features, and promotional content.
  - If Knowledge-based: Focus on educational value, thought-leadership, and key insights.
  
  Return a JSON object with:
  - title: A catchy title
  - brief: A detailed graphic brief
  - caption: A SHORT, engaging caption (max 2-3 sentences)
  - hashtags: Relevant hashtags
  - type: The most suitable post type (e.g. 🔴 Tiles & Flooring, 🔴 General, etc.)
  - outlet: The most suitable outlet
  
  Make it professional and high-converting.`;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON object with fields: title, brief, caption, hashtags, type, outlet.");
      const parsed = safeParseJSON(puterResponse || '{}');
      if (parsed && parsed.title) return parsed;
    } catch (error) {
      console.warn("Puter failed for smart post, falling back:", error);
    }
  } else if (settings.preferredProvider === 'groq') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON object with fields: title, brief, caption, hashtags, type, outlet.");
      const parsed = safeParseJSON(groqResponse || '{}');
      if (parsed && parsed.title) return parsed;
    } catch (error) {
      console.warn("Groq failed for smart post, falling back:", error);
    }
  }

  const text = await generateTextWithCascade(prompt, true);

  try {
    return JSON.parse(text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {};
  }
}

export async function generatePostVisuals(title: string, brief: string, brandKit: any, business?: Business): Promise<{ url: string, provider: string }[]> {
  const settings = getAiSettings();
  
  if (settings.imageProvider === 'pollination' || settings.imageProvider === 'puter') {
    const style = brandKit?.style || 'photorealistic';
    const image = await generateAiImage(`${title}. ${brief}`, style, business);
    return [image];
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  
  let designGuide = brandKit?.designGuide || '';
  if (!designGuide && business?.id) {
    designGuide = await fetchBrandKitDesignGuide(business.id);
  }

  // 1. Generate AI Image based on brief and brand kit
  const prompt = `Generate a high-quality social media post image for: ${title}. 
  Design Brief: ${brief}
  Brand Kit Context: ${JSON.stringify(brandKit)}
  ${designGuide ? `\nDESIGN GUIDE & STYLE REFERENCE:\n${designGuide}\n` : ''}
  
  The image should be photorealistic, professional, and follow the brand guidelines.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K"
      }
    }
  });

  const images: { url: string, provider: string }[] = [];
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      images.push({ url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, provider: 'Gemini' });
    }
  }

  if (images.length === 0) {
    throw new Error("No image generated");
  }

  return images;
}

export async function generatePostFromImage(base64Data: string, mimeType: string, outlet?: string, isVideo?: boolean, business?: Business) {
  const settings = getAiSettings();
  const outletContext = outlet ? ` for the outlet "${outlet}"` : '';
  const businessName = business?.name || 'Forge Enterprises';
  const businessIndustry = business?.industry || 'professional business';
  const systemInstruction = settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : '';
  
  let designContext = '';
  if (business?.id) {
    const guide = await fetchBrandKitDesignGuide(business.id);
    if (guide) {
      designContext = `\n\nDESIGN GUIDE & STYLE REFERENCE (Follow this style closely):\n${guide}\n`;
    }
  }

  const promptText = isVideo 
    ? `Analyze this 2x2 collage of frames extracted from a video and generate a social media post for ${businessName} (a ${businessIndustry})${outletContext}. 
       Treat this as a video analysis by looking at the sequence of frames.
       ${systemInstruction}
       ${designContext}
       Return JSON with exactly these fields: title (short, catchy), brief (internal instructions for designer), caption (engaging social media text), hashtags (string of space-separated tags), type (e.g., 'Tiles & Flooring', 'How-To / Tips', 'Living Mall', 'Behind the Scenes'), outlet (e.g., 'Buildware', 'Living Mall', 'Office system').`
    : `Analyze this image and generate a social media post for ${businessName} (a ${businessIndustry})${outletContext}. 
       ${systemInstruction}
       ${designContext}
       Return JSON with exactly these fields: title (short, catchy), brief (internal instructions for designer), caption (engaging social media text), hashtags (string of space-separated tags), type (e.g., 'Tiles & Flooring', 'How-To / Tips', 'Living Mall', 'Behind the Scenes'), outlet (e.g., 'Buildware', 'Living Mall', 'Office system').`;
  
  try {
    if (settings.preferredProvider === 'puter') {
      const puterResponse = await fetchFromPuter(
        promptText + " You MUST return ONLY a valid JSON object.",
        [{ base64: base64Data, mimeType }]
      );
      return safeParseJSON(puterResponse || '{}');
    }

    if (settings.preferredProvider === 'groq') {
      const groqResponse = await fetchFromGroq(
        promptText + " You MUST return ONLY a valid JSON object.",
        [{ base64: base64Data, mimeType }]
      );
      return JSON.parse(groqResponse || '{}');
    }

    if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const result = await model.generateContent([
        { inlineData: { data: base64Data, mimeType } },
        { text: promptText }
      ]);
      const response = await result.response;
      return JSON.parse(response.text() || '{}');
    }

    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            brief: { type: Type.STRING },
            caption: { type: Type.STRING },
            hashtags: { type: Type.STRING },
            type: { type: Type.STRING },
            outlet: { type: Type.STRING }
          },
          required: ["title", "brief", "caption", "hashtags", "type", "outlet"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.warn("Primary provider failed, falling back:", error);
    if (settings.preferredProvider !== 'groq' && settings.preferredProvider !== 'auto' && settings.preferredProvider !== 'puter') {
      const groqResponse = await fetchFromGroq(
        promptText + " You MUST return ONLY a valid JSON object.",
        [{ base64: base64Data, mimeType }]
      );
      return JSON.parse(groqResponse || '{}');
    }
    throw error;
  }
}

export async function analyzeDesignImages(images: string[], business?: Business): Promise<string> {
  const settings = getAiSettings();
  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  try {
    const ai = getAi();
    const prompt = `You are an expert Design Director. Analyze these ${images.length} images which represent the brand's desired visual style or recent successful posts.
    
    Extract:
    1. Visual Style & Aesthetic (minimalist, vibrant, professional, etc.)
    2. Color Palette (dominant colors and how they are used)
    3. Typography Style (serif, sans-serif, bold, elegant)
    4. Composition Patterns (how elements are arranged)
    5. Content Themes (what is being shown)
    
    Provide a detailed analysis that can be used to create a Brand Design Guide.`;

    const parts = [
      { text: prompt },
      ...images.map(img => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: img.split(',')[1] || img
        }
      }))
    ];

    const response = await ai.models.generateContent({
      model: settings.geminiModel || "gemini-2.5-flash",
      contents: [{ role: 'user', parts }],
    });

    return response.text || '';
  } catch (error) {
    console.error('Design image analysis error:', error);
    throw error;
  }
}

export async function generateTaskIdeas(
  business?: Business, 
  brandKitCategories?: any[],
  brandKitTitles?: { [key: string]: string },
  systemInstruction?: string,
  extraContext?: string
) {
  const settings = getAiSettings();
  const industryConfig = getIndustryConfig(business?.industry);
  
  let generalContext = '';
  let businessContext = business ? `\nBUSINESS CONTEXT: Name: ${business.name}. Industry: ${business.industry}. Position: ${business.position || 'General'}.` : 'Business: Forge Enterprises (Professional Services)';
  
  const aiContext = systemInstruction || `\nROLE: You are an ${industryConfig.aiContext.role}.\nFOCUS: ${industryConfig.aiContext.focus}.\nTONE: ${industryConfig.aiContext.tone}.`;
  
  try {
    const userId = auth.currentUser?.uid;
    const businessId = business?.id;

    if (userId && businessId) {
      // Fetch some general products for variety
      const qGeneral = query(collection(db, 'inventory_products'), where('businessId', '==', businessId));
      const snapshotGeneral = await getDocs(qGeneral);
      const productsGeneral = snapshotGeneral.docs.map(doc => doc.data());
      if (productsGeneral.length > 0) {
        const products = productsGeneral
          .sort(() => 0.5 - Math.random())
          .slice(0, 15);
        
        if (products.length > 0) {
          generalContext = `\nAVAILABLE PRODUCTS/SERVICES: ${products.map(p => p.title).join(', ')}.`;
        }
      }
    } else {
      // Local storage fallback (Legacy or Guest)
      const savedGeneral = localStorage.getItem('forge_inventory_cache');
      if (savedGeneral) {
        const productsGeneral = JSON.parse(savedGeneral);
        if (productsGeneral.length > 0) {
          const products = productsGeneral.slice(0, 15);
          generalContext = `\nAVAILABLE PRODUCTS/SERVICES: ${products.map((p: any) => p.title).join(', ')}.`;
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch products for ideas", e);
  }

  const titles = brandKitTitles || {
    category: 'Product Category',
    outlet: 'Outlet',
    campaign: 'Campaign Type',
    type: 'Content Format'
  };

  const categoriesContext = brandKitCategories ? `\nBRAND KIT ${titles.category.toUpperCase()} (Use these for variety): ${brandKitCategories.filter(c => c.type === 'category' && c.enabled).map(c => c.name).join(', ')}` : '';
  const outletsContext = brandKitCategories ? `\nBRAND KIT ${titles.outlet.toUpperCase()}: ${brandKitCategories.filter(c => c.type === 'outlet' && c.enabled).map(c => c.name).join(', ')}` : '';
  const campaignTypesContext = brandKitCategories ? `\nBRAND KIT ${titles.campaign.toUpperCase()}: ${brandKitCategories.filter(c => c.type === 'campaign' && c.enabled).map(c => c.name).join(', ')}` : '';
  const contentFormatsContext = brandKitCategories ? `\nBRAND KIT ${titles.type.toUpperCase()}: ${brandKitCategories.filter(c => c.type === 'type' && c.enabled).map(c => c.name).join(', ')}` : '';

  const linkContext = business?.targetUrl || settings.targetUrl ? `\nCRITICAL: Focus specifically on making posts using the products found on this link: ${business?.targetUrl || settings.targetUrl}` : '';
  
  let designContext = '';
  if (business?.id) {
    const guide = await fetchBrandKitDesignGuide(business.id);
    if (guide) {
      designContext = `\n\nDESIGN GUIDE & STYLE REFERENCE (Follow this style closely):\n${guide}\n`;
    }
  }

  const generalCategories = [
    "Living Room Furniture", "Bedroom Essentials", "Kitchen Systems", 
    "Power Tools", "Building Materials", "Office Furniture", 
    "Lighting & Electrical", "Sanitary & Bathroom", "Tiles & Flooring",
    "Home Decor", "Outdoor & Garden", "Hardware & Tools"
  ].join(', ');

  const promptText = `Generate 10 unique and creative social media post ideas.
    ${aiContext}
    ${businessContext}
    ${designContext}
    ${linkContext}
    ${extraContext ? `\nADDITIONAL CONTEXT/PRODUCT LIST: ${extraContext}` : ''}
    ${generalContext}
    ${categoriesContext}
    ${outletsContext}
    ${campaignTypesContext}
    ${contentFormatsContext}
    \nGENERAL CATEGORIES (If specific products are sparse): ${generalCategories}

    CRITICAL STRATEGY: 
    1. BALANCE: You are generating 10 ideas. 
       - At least 6 ideas SHOULD focus on "AVAILABLE PRODUCTS/SERVICES" or "ADDITIONAL CONTEXT" (if provided).
       - 2 ideas SHOULD focus on general home improvement themes/categories.
       - 2 ideas SHOULD be "Wildcard" (e.g., lifestyle tips, seasonal trends, or "Behind the Scenes").
    2. VARIETY: Ensure the ideas cover different outlets and different content types (How-To, Showcase, Promotion).
    3. FRAMEWORKS: For each idea, you MUST use a proven marketing framework (e.g., AIDA, PAS, BAB, or FAB) to structure the caption.
    4. METRICS: For each idea, provide a "feasibility" score (1-10) and an "impact" score (1-10).

    Return a JSON array of 10 objects. Each object must have exactly these fields:
    - title: A short, catchy title for the post
    - brief: Visual instructions for the graphic designer
    - caption: A SHORT, engaging Instagram/Facebook caption structured with a marketing framework (max 2-3 sentences)
    - hashtags: Space-separated hashtags
    - type: (e.g., 'Tiles & Flooring', 'How-To / Tips', 'Showcase', 'Behind the Scenes') - Use BRAND KIT ${titles.category.toUpperCase()} if available.
    - outlet: (e.g., 'Main Store', 'Online Shop', 'Showroom') - Use BRAND KIT ${titles.outlet.toUpperCase()} if available.
    - format: (e.g., 'Post', 'Reel', 'Story', 'Carousel') - Use BRAND KIT ${titles.type.toUpperCase()} if available.
    - feasibility: number (1-10)
    - impact: number (1-10)`;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(promptText + " You MUST return ONLY a valid JSON object with a 'posts' array containing the 10 objects. Example: {\"posts\": [...]}");
      const parsed = safeParseJSON(puterResponse || '{}');
      return parsed.posts || parsed || [];
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(promptText + " You MUST return ONLY a valid JSON object with a 'posts' array containing the 10 objects. Example: {\"posts\": [...]}");
      const parsed = JSON.parse(groqResponse || '{}');
      return parsed.posts || parsed || [];
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  try {
    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              brief: { type: Type.STRING },
              caption: { type: Type.STRING },
              hashtags: { type: Type.STRING },
              type: { type: Type.STRING },
              outlet: { type: Type.STRING },
              format: { type: Type.STRING },
              feasibility: { type: Type.NUMBER },
              impact: { type: Type.NUMBER }
            },
            required: ["title", "brief", "caption", "hashtags", "type", "outlet", "format", "feasibility", "impact"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.warn("Gemini failed, falling back to Groq:", error);
    const groqResponse = await fetchFromGroq(
      promptText + " You MUST return ONLY a valid JSON object with a 'posts' array containing the 10 objects. Example: {\"posts\": [...]}"
    );
    const parsed = JSON.parse(groqResponse || '{}');
    return parsed.posts || parsed || [];
  }
}

export interface HighStockProduct {
  title: string;
  type: string;
  link: string;
  stockInfo: string;
  outlet: string;
  sku?: string;
  price?: string;
  categories?: string[];
}

export interface CategoryCount {
  category: string;
  count: number;
}

export async function getCategoryProductCounts(targetUrlParam?: string): Promise<CategoryCount[]> {
  const settings = getAiSettings();
  const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';
  const prompt = `Estimate the total number of products available on ${baseUrl} based on your knowledge of the site.
    Also, if possible, identify the main product categories on the site and estimate the number of products in each category.
    Return a JSON array of objects with these fields:
    - category: The name of the category (e.g., "All Products", "Furniture", "Electronics")
    - count: The estimated number of products (as a number, e.g., 5000)`;

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || '[]';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }
    return JSON.parse(text);
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            count: { type: Type.NUMBER }
          },
          required: ["category", "count"]
        }
      }
    }
  });
  
  let text = response.text || '[]';
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    text = text.substring(start, end + 1);
  }
  return JSON.parse(text);
}

export async function extractInfoFromMarkdown(markdown: string): Promise<HighStockProduct[]> {
  const settings = getAiSettings();
  const safeMarkdown = typeof markdown === 'string' ? markdown : JSON.stringify(markdown);
  const prompt = `You are an information extraction expert. Your task is to extract key knowledge, facts, or insights from the following markdown content of a website.
    The website is likely a documentation page, a blog post, or a research article.
    
    For each key piece of information, identify:
    - title: A short, descriptive title for this insight or fact.
    - type: The topic or category it belongs to (e.g., Technical, Strategy, Research, Case Study).
    - stockInfo: A concise 1-2 sentence summary of the key takeaway or fact.
    - link: The direct URL to the source (if available in the markdown).

    Rules:
    1. Return ONLY a valid JSON array of objects.
    2. If no significant information is found, return an empty array [].
    3. Do not include any explanations or markdown formatting in your response.
    4. Be thorough and capture the most valuable insights.
    
    Markdown content:
    ${safeMarkdown.substring(0, 25000)}`;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON array of objects. Example: [{\"title\": \"...\", \"type\": \"...\", \"stockInfo\": \"...\", \"link\": \"...\"}]");
      let parsed = safeParseJSON(puterResponse || '[]');
      if (!Array.isArray(parsed) && parsed.data) parsed = parsed.data;
      if (!Array.isArray(parsed) && parsed.items) parsed = parsed.items;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON array of objects. Example: [{\"title\": \"...\", \"type\": \"...\", \"stockInfo\": \"...\", \"link\": \"...\"}]");
      let parsed = JSON.parse(groqResponse || '[]');
      if (!Array.isArray(parsed) && parsed.data) parsed = parsed.data;
      if (!Array.isArray(parsed) && parsed.items) parsed = parsed.items;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || '[]';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      return [];
    }
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            stockInfo: { type: Type.STRING },
            link: { type: Type.STRING }
          },
          required: ["title", "type", "stockInfo"]
        }
      }
    }
  });
  
  let text = response.text || '[]';
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    text = text.substring(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    return [];
  }
}

export async function extractProductsFromMarkdown(markdown: string): Promise<HighStockProduct[]> {
  const settings = getAiSettings();
  const safeMarkdown = typeof markdown === 'string' ? markdown : JSON.stringify(markdown);
  const prompt = `You are a product extraction expert. Your task is to extract all products listed in the following markdown content of a website.
    The website is likely an e-commerce shop. Products are often listed in grids, lists, or tables.
    
    For each product, identify:
    - title: The full name of the product.
    - type: The category it belongs to (e.g., Furniture, Sofa, Bed Frame, Appliances). If not explicitly stated, infer it from the context or the page title.
    - price: The price including currency (e.g., MVR 5,000).
    - stockInfo: Any mention of availability (e.g., "In Stock", "Out of Stock", "High Stock", "Only 2 left").
    - link: The direct URL to the product page (if available in the markdown).

    Rules:
    1. Return ONLY a valid JSON array of objects.
    2. If no products are found, return an empty array [].
    3. Do not include any explanations or markdown formatting in your response.
    4. Be thorough and capture every product mentioned in the main list.
    
    Markdown content:
    ${safeMarkdown.substring(0, 25000)}`; // Increased limit to 25k chars

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON array of objects. Example: [{\"title\": \"...\", \"type\": \"...\", \"price\": \"...\", \"stockInfo\": \"...\", \"link\": \"...\"}]");
      let parsed = safeParseJSON(puterResponse || '[]');
      if (!Array.isArray(parsed) && parsed.data) parsed = parsed.data;
      if (!Array.isArray(parsed) && parsed.items) parsed = parsed.items;
      if (!Array.isArray(parsed) && parsed.products) parsed = parsed.products;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON array of objects. Example: [{\"title\": \"...\", \"type\": \"...\", \"price\": \"...\", \"stockInfo\": \"...\", \"link\": \"...\"}]");
      let parsed = JSON.parse(groqResponse || '[]');
      if (!Array.isArray(parsed) && parsed.data) parsed = parsed.data;
      if (!Array.isArray(parsed) && parsed.items) parsed = parsed.items;
      if (!Array.isArray(parsed) && parsed.products) parsed = parsed.products;
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text() || '[]';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI product extraction:", e);
      return [];
    }
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING },
            price: { type: Type.STRING },
            stockInfo: { type: Type.STRING },
            link: { type: Type.STRING }
          },
          required: ["title", "type"]
        }
      }
    }
  });
  
  let text = response.text || '[]';
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    text = text.substring(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI product extraction:", e);
    return [];
  }
}

export async function scrapeWooCommerce(
  category: string,
  onProgress?: (products: HighStockProduct[]) => void,
  targetUrlParam?: string,
  business?: Business
): Promise<{ products: HighStockProduct[], logs: string[] }> {
  const logs: string[] = [];
  const allProducts: HighStockProduct[] = [];
  const settings = getAiSettings();
  const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';

  // Fallback URL structure
  const targetUrl = category === "All Products" 
    ? `${baseUrl}/shop/`
    : `${baseUrl}/product-category/${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/`;

  // 1. Try Firecrawl Scrape first
  logs.push(`🔍 Attempting Firecrawl scrape for [${category}] at ${targetUrl}...`);
  try {
    const firecrawlRes = await fetch('/api/firecrawl-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl, apiKey: settings.firecrawlApiKey })
    });
    const firecrawlData = await firecrawlRes.json();
    
    if (firecrawlRes.ok && firecrawlData.success && firecrawlData.data?.markdown) {
      logs.push(`✅ Firecrawl Scrape successful. Extracting products with AI...`);
      const extracted = await extractProductsFromMarkdown(firecrawlData.data.markdown);
      
      if (extracted.length > 0) {
        logs.push(`✅ AI found ${extracted.length} products`);
        extracted.forEach((p: any) => {
          allProducts.push({
            title: p.title,
            type: p.type || category,
            link: p.link || targetUrl,
            stockInfo: p.stockInfo || "High Stock",
            outlet: business?.name || "Store",
            price: p.price
          });
        });
        if (onProgress) onProgress([...allProducts]);
      } else {
        logs.push(`🔍 AI: No products found in scraped content`);
      }
    } else {
      logs.push(`🔍 Firecrawl Scrape: No content found or failed`);
    }
  } catch (e) {
    logs.push(`⚠️ Firecrawl Scrape failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const unique = Array.from(
    new Map(allProducts.map(p => [p.title.toLowerCase(), p])).values()
  );
  return { products: unique.slice(0, 100), logs };
}

export interface FetchResult {
  products: HighStockProduct[];
  meta: {
    aiCount: number;
    scrapedCount: number;
    totalUnique: number;
    logs?: string[];
  };
}

export async function scrapeScreenshot(url: string, category: string, targetUrlParam?: string): Promise<HighStockProduct[]> {
  try {
    // Fetch screenshot from our native backend
    const response = await fetch(`/api/screenshot?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch screenshot: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.base64) {
      throw new Error("Invalid screenshot data received");
    }
    
    const base64String = data.base64;
    const mimeType = data.mimeType || 'image/jpeg';
    const settings = getAiSettings();
    const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';
    const prompt = `Extract all products visible in this screenshot from the category "${category}".
            For each product, find:
            1. title: The full product name.
            2. price: The price (e.g., "MVR 1,200").
            3. stock: Is it in stock? (e.g., "In Stock", "Out of Stock").
            4. sku: The product code if visible (e.g., "RIO-CFF0007-2").
            5. categories: An array of categories (e.g., ["Furniture", "Living Room"]).
            6. link: The product URL (guess the slug from the title if not visible, e.g., ${baseUrl}/product/sofa-name/).

            Return ONLY a JSON array of objects with these fields: title, type, link, stockInfo, outlet, sku, price, categories.
            The "stockInfo" field should combine stock and price (e.g., "In Stock - MVR 1,200").
            The "type" field should be the category "${category}".
            The "outlet" field should be the business name.

            Do not include markdown formatting like \`\`\`json, just the raw JSON array.`;

    if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const result = await model.generateContent([
        { inlineData: { data: base64String, mimeType } },
        { text: prompt }
      ]);
      const response = await result.response;
      let text = response.text() || '[]';
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
        return JSON.parse(text);
      }
      return [];
    }

    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }

    const ai = getAi();
    const aiResponse = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64String,
              mimeType: mimeType,
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    let text = aiResponse.text || '[]';
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
      return JSON.parse(text);
    }
    return [];
  } catch (error) {
    console.error("Failed to scrape screenshot:", error);
    return [];
  }
}

export async function findProductsByCategory(
  category: string, 
  existingTitles: string[] = [],
  onProgress?: (products: HighStockProduct[]) => void,
  targetUrlParam?: string,
  business?: Business
): Promise<FetchResult> {
  const settings = getAiSettings();
  const scraperResult = await scrapeWooCommerce(category, onProgress, targetUrlParam, business);
  const scrapedProducts = scraperResult.products;
  const scraperLogs = scraperResult.logs;
  
  let aiProducts: HighStockProduct[] = [];
  
  if (scrapedProducts.length < 15) {
    scraperLogs.push(`ℹ️ Firecrawl found few results (${scrapedProducts.length}). Asking AI to supplement...`);
    
    const recentTitles = existingTitles.slice(-50);
    const excludePrompt = recentTitles.length > 0 
      ? `\nCRITICAL: You MUST NOT return any of these items: ${recentTitles.join(', ')}. Find DIFFERENT products.` 
      : '';

    try {
      const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';
      if (settings.preferredProvider === 'firebase') {
        const model = getVertexModel(settings.geminiModel);
        const result = await model.generateContent(`Generate a list of 15 realistic products for a store like ${baseUrl} in the category "${category}".
        Return a JSON array of products with fields: title, type, link, stockInfo, outlet.
        IMPORTANT: The "stockInfo" field MUST be a simple string (e.g., "In Stock - MVR 1,200").
        Make sure the products sound like real items sold in the Maldives.
        ${excludePrompt}`);
        const response = await result.response;
        let text = response.text() || '[]';
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          text = text.substring(start, end + 1);
          aiProducts = JSON.parse(text);
          scraperLogs.push(`✅ AI supplemented with ${aiProducts.length} additional products`);
          if (onProgress) onProgress([...scrapedProducts, ...aiProducts]);
        }
      } else {
        if (!isGeminiKeyAvailable()) {
          await fetchServerConfig();
        }
        const ai = getAi();
        const response = await ai.models.generateContent({
          model: settings.geminiModel,
          contents: `Generate a list of 15 realistic products for a store like ${baseUrl} in the category "${category}".
          Return a JSON array of products with fields: title, type, link, stockInfo, outlet.
          IMPORTANT: The "stockInfo" field MUST be a simple string (e.g., "In Stock - MVR 1,200").
          Make sure the products sound like real items sold in the Maldives.
          ${excludePrompt}`,
          config: {
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING },
                  link: { type: Type.STRING },
                  stockInfo: { type: Type.STRING },
                  outlet: { type: Type.STRING }
                },
                required: ["title", "type", "link", "stockInfo", "outlet"]
              }
            }
          }
        });

        let text = response.text || '[]';
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) {
          text = text.substring(start, end + 1);
          aiProducts = JSON.parse(text);
          scraperLogs.push(`✅ AI supplemented with ${aiProducts.length} additional products`);
          if (onProgress) onProgress([...scrapedProducts, ...aiProducts]);
        }
      }
    } catch (e: any) {
      console.error("AI supplement failed:", e);
      scraperLogs.push(`⚠️ AI supplement failed: ${e.message || 'Unknown error'}`);
    }
  }

  let allProducts = [...scrapedProducts, ...aiProducts];
  
  if (allProducts.length === 0) {
    scraperLogs.push(`🚨 CRITICAL: All search methods failed. Providing emergency static fallback.`);
    const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';
    allProducts = [
      { title: "Modern Fabric Sofa", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 12,500", outlet: "Main Store" },
      { title: "King Size Bed Frame", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 8,900", outlet: "Main Store" },
      { title: "Office Executive Chair", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 3,200", outlet: "Office System" },
      { title: "Ceramic Floor Tiles (60x60)", type: "Building Materials", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 450/sqm", outlet: "Buildware" },
      { title: "Emulsion Wall Paint (20L)", type: "Building Materials", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 1,850", outlet: "Buildware" }
    ].filter(p => category === "All Products" || p.type === category || category === "Furniture" || category === "Building Materials");
  }

  const uniqueMap = new Map(allProducts.map(p => [p.title.toLowerCase(), p]));
  const uniqueProducts = Array.from(uniqueMap.values());
  
  return {
    products: uniqueProducts,
    meta: {
      aiCount: aiProducts.length,
      scrapedCount: scrapedProducts.length,
      totalUnique: uniqueProducts.length,
      logs: scraperLogs
    }
  };
}

export async function findHighStockProducts(category?: string, targetUrlParam?: string): Promise<HighStockProduct[]> {
  const cat = category || "All Products";
  const settings = getAiSettings();
  const baseUrl = targetUrlParam || settings.targetUrl || 'https://example.com';
  const prompt = `Search the website ${baseUrl} for products in the category "${cat}" that have high stock availability.
      Find at least 10 real products.
      Return a JSON array of objects with fields: title, type, link, stockInfo (include price if possible), outlet.
      IMPORTANT: The "stockInfo" field MUST be a simple string, NOT an object.`;

  try {
    if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearchRetrieval: {} } as any], // Vertex AI uses googleSearchRetrieval
      });
      const response = await result.response;
      let text = response.text() || '[]';
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
        return JSON.parse(text);
      }
    } else {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: settings.geminiModel,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                link: { type: Type.STRING },
                stockInfo: { type: Type.STRING },
                outlet: { type: Type.STRING }
              },
              required: ["title", "type", "link", "stockInfo", "outlet"]
            }
          }
        }
      });

      let text = '';
      if (response.candidates?.[0]?.content?.parts) {
        text = response.candidates[0].content.parts
          .filter(p => p.text)
          .map(p => p.text)
          .join('');
      } else {
        text = response.text || '[]';
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
        return JSON.parse(text);
      }
    }
  } catch (e) {
    console.error("AI high stock fetch failed:", e);
  }

  return [
    { title: "Modern Fabric Sofa", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 12,500", outlet: "Rainbow Living Mall" },
    { title: "King Size Bed Frame", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 8,900", outlet: "Rainbow Living Mall" },
    { title: "Office Executive Chair", type: "Furniture", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 3,200", outlet: "Rainbow Office System" },
    { title: "Ceramic Floor Tiles (60x60)", type: "Building Materials", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 450/sqm", outlet: "Rainbow Buildware" },
    { title: "Emulsion Wall Paint (20L)", type: "Building Materials", link: `${baseUrl}/shop/`, stockInfo: "In Stock — MVR 1,850", outlet: "Rainbow Buildware" }
  ];
}

export async function searchProductsDirectly(query: string): Promise<HighStockProduct[]> {
  try {
    const response = await fetch(`/api/direct-scrape?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Direct search failed:", data.details || data.error);
      return [];
    }

    return (data.products || []).map((p: any) => ({
      title: p.title,
      type: p.categories || "Product",
      link: p.link,
      stockInfo: p.stockInfo,
      outlet: "Rainbow Enterprises"
    }));
  } catch (e) {
    console.error("Direct search error:", e);
    return [];
  }
}

export async function searchNews(query: string, lang?: string, region?: string): Promise<any[]> {
  try {
    let url = `/api/news?q=${encodeURIComponent(query)}`;
    if (lang) url += `&lang=${lang}`;
    if (region) url += `&region=${region}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error("News search error:", e);
    return [];
  }
}

export async function searchScholar(query: string, yearFrom?: number): Promise<any[]> {
  try {
    let url = `/api/scholar?q=${encodeURIComponent(query)}`;
    if (yearFrom) url += `&year_from=${yearFrom}`;
    
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error("Scholar search error:", e);
    return [];
  }
}

export async function searchImages(query: string): Promise<any[]> {
  try {
    const response = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error("Image search error:", e);
    return [];
  }
}

export async function generateGenericText(prompt: string, systemInstruction?: string): Promise<string> {
  const settings = getAiSettings();

  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(fullPrompt);
      return puterResponse || '';
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(fullPrompt);
      return groqResponse || '';
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text() || '';
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: fullPrompt,
  });
  return response.text || '';
}

export async function generateGenericJson(prompt: string, systemInstruction?: string): Promise<any> {
  const settings = getAiSettings();

  const fullPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(fullPrompt + " You MUST return ONLY a valid JSON object.");
      return safeParseJSON(puterResponse || '{}');
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(fullPrompt + " You MUST return ONLY a valid JSON object.");
      return JSON.parse(groqResponse || '{}');
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return JSON.parse(response.text() || '{}');
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: fullPrompt,
    config: {
      responseMimeType: "application/json",
    }
  });
  return JSON.parse(response.text || '{}');
}

export async function generateAnalyticsReport(prompt: string): Promise<any> {
  const settings = getAiSettings();
  const ai = getAi();
  
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          bestTime: { type: Type.STRING },
          formatSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtagPerformance: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                tag: { type: Type.STRING },
                score: { type: Type.NUMBER }
              }
            }
          },
          summary: { type: Type.STRING },
          engagementRate: { type: Type.STRING },
          audienceDemographics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                segment: { type: Type.STRING },
                percentage: { type: Type.NUMBER }
              }
            }
          },
          competitorInsights: { type: Type.ARRAY, items: { type: Type.STRING } },
          growthTrend: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                period: { type: Type.STRING },
                value: { type: Type.NUMBER }
              }
            }
          },
          followerGrowth: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                period: { type: Type.STRING },
                count: { type: Type.NUMBER }
              }
            }
          },
          topPosts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                engagement: { type: Type.STRING },
                type: { type: Type.STRING }
              }
            }
          },
          engagementOverTime: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                rate: { type: Type.NUMBER }
              }
            }
          },
          contentPillars: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pillar: { type: Type.STRING },
                performance: { type: Type.NUMBER }
              }
            }
          }
        },
        required: [
          "bestTime", "formatSuggestions", "hashtagPerformance", "summary", 
          "engagementRate", "audienceDemographics", "competitorInsights", 
          "growthTrend", "followerGrowth", "topPosts", "engagementOverTime", "contentPillars"
        ]
      }
    }
  });
  
  return JSON.parse(response.text || '{}');
}

export async function generateCampaignFromUrl(url: string, systemInstruction?: string): Promise<any> {
  const settings = getAiSettings();
  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel('gemini-3.1-pro-preview');
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Generate a multi-platform social media campaign based on this URL: ${url}` }] }],
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
    });
    const response = await result.response;
    return safeParseJSON(response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
  } else {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Generate a multi-platform social media campaign based on this URL: ${url}`,
      config: {
        systemInstruction: systemInstruction || "You are an expert social media manager.",
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            twitterThread: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A series of 3-5 tweets forming a thread."
            },
            linkedinPost: {
              type: Type.STRING,
              description: "A professional, thought-leadership post for LinkedIn."
            },
            instagramCaption: {
              type: Type.STRING,
              description: "An engaging caption for an Instagram post or carousel."
            }
          },
          required: ["twitterThread", "linkedinPost", "instagramCaption"]
        }
      }
    });
    return safeParseJSON(response.text || "{}");
  }
}

export async function generateCaption(topic: string, business?: Business): Promise<string> {
  const settings = getAiSettings();
  const businessName = business?.name || 'our business';
  const prompt = `Write an engaging, professional social media caption for "${businessName}" about the following topic: "${topic}". Include relevant emojis and a call to action. Do not include hashtags.`;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY the caption text.");
      return puterResponse || '';
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY the caption text.");
      return groqResponse || '';
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || '';
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
  });
  return response.text || '';
}

export async function generatePostWithFramework(topic: string, framework: 'AIDA' | 'PAS' | 'BAB', business?: Business): Promise<string> {
  const settings = getAiSettings();
  const frameworkPrompts = {
    AIDA: "Attention, Interest, Desire, Action",
    PAS: "Problem, Agitate, Solution",
    BAB: "Before, After, Bridge"
  };
  
  const businessName = business?.name || 'our business';
  const prompt = `Write an engaging, professional social media caption for "${businessName}" about the following topic: "${topic}". 
  Use the ${framework} marketing framework: ${frameworkPrompts[framework]}.
  Include relevant emojis and a clear call to action. Do not include hashtags.`;

  if (settings.preferredProvider === 'puter') {
    try {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY the caption text.");
      return puterResponse || '';
    } catch (error) {
      console.warn("Puter failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
    try {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY the caption text.");
      return groqResponse || '';
    } catch (error) {
      console.warn("Groq failed, falling back to AI:", error);
    }
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel(settings.geminiModel);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || '';
  }

  if (!isGeminiKeyAvailable()) {
    await fetchServerConfig();
  }

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: settings.geminiModel,
    contents: prompt,
  });
  return response.text || '';
}

export async function getExcelMappingWithAi(jsonData: any[]): Promise<Record<string, string>> {
  const settings = getAiSettings();
  
  if (jsonData.length === 0) return {};

  const sampleData = jsonData.slice(0, 3);
  
  const prompt = `
    I have an Excel file with ${jsonData.length} rows. I need you to identify the mapping between the Excel columns and my "Post" object fields.
    
    Standard Post Object Fields:
    - title: string (The main headline or title)
    - brief: string (Short description or brief)
    - caption: string (A SHORT social media caption, max 2-3 sentences)
    - hashtags: string (Hashtags)
    - date: string (YYYY-MM-DD format)
    - outlet: string (Platform name like Instagram, Facebook, etc.)
    - type: string (Category like "🔴 Tiles & Flooring", "🔵 Sanitaryware", etc.)
    - productCategory: string (Specific product category)
    - link: string (URL)
    
    Sample Data from Excel (First 3 rows):
    ${JSON.stringify(sampleData, null, 2)}
    
    Please return a JSON object where the keys are the Excel column names and the values are the corresponding "Post" field names.
    If a column doesn't match any field, map it to "none".
    Example: {"Excel Column Name": "title", "Another Column": "brief", "Post ID": "none", ...}
    
    Return ONLY the mapping JSON object.
  `;

  try {
    let result: any;
    if (settings.preferredProvider === 'puter') {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON object.");
      result = safeParseJSON(puterResponse || '{}');
    } else if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
      const groqResponse = await fetchFromGroq(prompt + " You MUST return ONLY a valid JSON object.");
      result = JSON.parse(groqResponse || '{}');
    } else if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const res = await model.generateContent(prompt);
      const response = await res.response;
      result = JSON.parse(response.text() || '{}');
    } else {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: settings.geminiModel,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      result = JSON.parse(response.text || '{}');
    }

    return result.mapping || result.posts || result.data || result;
  } catch (error) {
    console.error("AI Mapping failed:", error);
    return {};
  }
}

export async function generateBulkPosts(category: string, count: number = 5, business?: Business, systemInstruction?: string): Promise<Partial<Post>[]> {
  const settings = getAiSettings();
  const industryConfig = getIndustryConfig(business?.industry);
  const businessContext = business ? `\nBUSINESS CONTEXT: Name: ${business.name}. Industry: ${business.industry}. Position: ${business.position || 'General'}.` : 'Business: Forge Enterprises (Professional Services)';
  
  const aiContext = systemInstruction || (settings.systemInstructions ? `\n\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : `\nROLE: You are an ${industryConfig.aiContext.role}.\nFOCUS: ${industryConfig.aiContext.focus}.\nTONE: ${industryConfig.aiContext.tone}.`);

  let designContext = '';
  if (business?.id) {
    const guide = await fetchBrandKitDesignGuide(business.id);
    if (guide) {
      designContext = `\n\nDESIGN GUIDE & STYLE REFERENCE (Follow this style closely):\n${guide}\n`;
    }
  }

  const promptText = `Generate ${count} unique and creative social media post ideas for ${business?.name || 'Forge Enterprises'} (a ${business?.industry || 'professional business'}) in the category "${category}".
    ${aiContext}
    ${businessContext}
    ${designContext}
    Return a JSON array of ${count} objects. Each object must have exactly these fields:
    - title: A short, catchy title for the post
    - brief: Visual instructions for the graphic designer
    - caption: A SHORT, engaging Instagram/Facebook caption with emojis (max 2-3 sentences)
    - hashtags: Space-separated hashtags
    - type: (e.g., 'Tiles & Flooring', 'How-To / Tips', 'Living Mall', 'Behind the Scenes')
    - outlet: (e.g., 'Buildware', 'Living Mall', 'Office system')`;

  try {
    if (settings.preferredProvider === 'puter') {
      const puterResponse = await fetchFromPuter(promptText + " You MUST return ONLY a valid JSON object with a 'posts' array.");
      const parsed = safeParseJSON(puterResponse || '{}');
      return parsed.posts || parsed || [];
    }

    if (settings.preferredProvider === 'groq' || settings.preferredProvider === 'auto') {
      const groqResponse = await fetchFromGroq(promptText + " You MUST return ONLY a valid JSON object with a 'posts' array.");
      const parsed = JSON.parse(groqResponse || '{}');
      return parsed.posts || parsed || [];
    }

    if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const result = await model.generateContent(promptText);
      const response = await result.response;
      return JSON.parse(response.text() || '[]');
    }

    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              brief: { type: Type.STRING },
              caption: { type: Type.STRING },
              hashtags: { type: Type.STRING },
              type: { type: Type.STRING },
              outlet: { type: Type.STRING }
            },
            required: ["title", "brief", "caption", "hashtags", "type", "outlet"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Bulk generation failed:", error);
    return [];
  }
}

export async function generateAiImage(prompt: string, style: string = 'photorealistic', business?: Business): Promise<{ url: string, provider: string }> {
  const businessName = business?.name || 'Forge';
  let designGuide = '';
  if (business?.id) {
    designGuide = await fetchBrandKitDesignGuide(business.id);
  }
  
  const fullPrompt = `${prompt}. 
  Style: ${style}. 
  ${designGuide ? `\nDESIGN GUIDE & BRAND GUIDELINES:\n${designGuide}\n` : ''}
  High quality, professional social media content for ${businessName}.`;
  
  const settings = getAiSettings();

  if (settings.imageProvider === 'pollination') {
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const model = settings.pollinationModel || 'flux';
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=${model}`;
    
    // Fetch the image and convert to base64
    const headers: Record<string, string> = {};
    if (settings.pollinationApiKey) {
      headers['Authorization'] = `Bearer ${settings.pollinationApiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error("Failed to generate image with Pollination.ai");
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return { url: base64, provider: 'Pollination.ai' };
  }

  if (settings.imageProvider === 'puter') {
    const puterInstance = (window as any).puter;
    if (!puterInstance) {
      throw new Error("Puter.js is not loaded yet. Please refresh the page.");
    }

    // Check if signed in
    const isSignedIn = await puterInstance.auth.isSignedIn();
    if (!isSignedIn) {
      throw new Error("Please sign in to Puter.js in Settings to use this image provider.");
    }

    const model = settings.puterImageModel || 'dall-e-3';
    console.log(`[Puter] Generating image with model ${model}...`);
    const image = await puterInstance.ai.txt2img(fullPrompt, { model });
    
    if (!image || !image.src) {
      throw new Error("Puter.js failed to generate an image.");
    }
    
    return { url: image.src, provider: 'Puter.js' };
  }

  if (settings.preferredProvider === 'firebase') {
    const model = getVertexModel('gemini-2.5-flash-image');
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, provider: 'Gemini' };
      }
    }
  } else {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, provider: 'Gemini' };
      }
    }
  }
  throw new Error("No image generated");
}

export async function generateHashtagSuggestions(content: string, business?: Business): Promise<string[]> {
  const settings = getAiSettings();
  const industry = business?.industry || 'general';
  const prompt = `Generate 15 relevant and trending hashtags for a social media post with this content: "${content}". 
  Focus on the "${industry}" industry context. 
  Return ONLY a JSON array of strings.`;

  try {
    if (settings.preferredProvider === 'puter') {
      const puterResponse = await fetchFromPuter(prompt + " You MUST return ONLY a JSON array of strings.");
      const parsed = safeParseJSON(puterResponse || '[]');
      return Array.isArray(parsed) ? parsed : [];
    }

    if (settings.preferredProvider === 'firebase') {
      const model = getVertexModel(settings.geminiModel);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text() || '[]';
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        text = text.substring(start, end + 1);
      }
      return JSON.parse(text);
    }

    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: settings.geminiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (e) {
    console.error("Hashtag generation failed:", e);
    return [];
  }
}

export async function generateGreeting(userName: string, timeOfDay: string): Promise<string> {
  const settings = getAiSettings();
  const prompt = `Generate a highly creative, unique, and energetic greeting for a user named "${userName}". 
  The current time of day is "${timeOfDay}". 
  CRITICAL: DO NOT use standard phrases like "Good morning", "Good afternoon", "Good evening", or "Hello". 
  Be imaginative, inspiring, or slightly playful. Keep it under 12 words. Do not include quotes.`;

  try {
    if (settings.preferredProvider === 'puter') {
      const puterResponse = await fetchFromPuter(prompt);
      if (puterResponse) return puterResponse.replace(/["']/g, '').trim();
    }
    
    if (!isGeminiKeyAvailable()) {
      await fetchServerConfig();
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.9,
      }
    });
    return response.text?.replace(/["']/g, '').trim() || `Ready to conquer the ${timeOfDay}, ${userName}?`;
  } catch (error) {
    console.error("Failed to generate greeting:", error);
    return `Ready to conquer the ${timeOfDay}, ${userName}?`;
  }
}

export async function generateDailyGreetings(userName: string): Promise<{ morning: string, evening: string, night: string, midnight: string }> {
  const settings = getAiSettings();
  const prompt = `Generate 4 unique, creative, and energetic greetings for a user named "${userName}".
  One for each time of day: morning, evening, night, and midnight.
  
  CRITICAL: DO NOT use standard phrases like "Good morning", "Good evening", etc.
  Be imaginative, inspiring, or slightly playful. Keep each under 12 words.
  
  Return ONLY a valid JSON object with keys: morning, evening, night, midnight.`;

  try {
    let text = '';
    if (settings.preferredProvider === 'puter') {
      text = await fetchFromPuter(prompt + " You MUST return ONLY a valid JSON object.");
    } else {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.9,
        }
      });
      text = response.text || '{}';
    }

    const parsed = safeParseJSON(text);
    if (parsed && parsed.morning) return parsed;
    
    throw new Error("Invalid greeting format");
  } catch (error) {
    console.error("Failed to generate daily greetings:", error);
    return {
      morning: `Rise and shine, ${userName}! Let's make today legendary.`,
      evening: `The sun sets, but your momentum doesn't, ${userName}.`,
      night: `Stars are out, and so is your brilliance, ${userName}.`,
      midnight: `Burning the midnight oil? You're a force of nature, ${userName}.`
    };
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Array of base64 data URIs
}

export interface ChatResponse {
  message: string;
  suggestedPost?: {
    title?: string;
    brief?: string;
    caption?: string;
    hashtags?: string;
    type?: string;
    outlet?: string;
  };
}

export async function chatWithAi(
  messages: ChatMessage[],
  contextStr: string
): Promise<ChatResponse> {
  const settings = getAiSettings();
  
  const systemInstruction = `You are Forge AI, an expert social media manager and creative assistant.
Your goal is to help the user create, improve, or brainstorm social media posts, products, and ideas.
You are highly capable of understanding complex tasks.

Context about the current item the user is looking at:
${contextStr || 'None'}

${settings.systemInstructions ? `\nCUSTOM SYSTEM INSTRUCTIONS:\n${settings.systemInstructions}` : ''}

You MUST respond with a valid JSON object containing:
1. "message": Your conversational response to the user. Be helpful, concise, and smart. Use Markdown formatting for better readability (bold, lists, etc.).
2. "suggestedPost": (OPTIONAL) If the user asks you to create or modify a post, provide the updated post details here. It should include:
   - title: A short, catchy title
   - brief: Visual instructions for the graphic designer
   - caption: A SHORT, engaging caption (max 2-3 sentences)
   - hashtags: Space-separated hashtags
   - type: Post type (e.g., '🔴 General')
   - outlet: Platform or outlet name

Return ONLY valid JSON. No markdown formatting for the JSON block itself, no backticks around the JSON.`;

  try {
    let text = '';
    
    if (settings.preferredProvider === 'puter') {
      const conversation = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const prompt = `${systemInstruction}\n\nConversation History:\n${conversation}\n\nGenerate the JSON response:`;
      text = await fetchFromPuter(prompt);
    } else {
      if (!isGeminiKeyAvailable()) {
        await fetchServerConfig();
      }
      const ai = getAi();
      
      const contents = messages.map((msg, index) => {
        const parts: any[] = [];
        
        // Prepend system instructions to the first user message
        let textContent = msg.content;
        if (index === 0 && msg.role === 'user') {
          textContent = `${systemInstruction}\n\nUser: ${textContent}`;
        }
        
        parts.push({ text: textContent });
        
        if (msg.images && msg.images.length > 0) {
          for (const img of msg.images) {
            const base64Data = img.split(',')[1] || img;
            const mimeType = img.split(';')[0].split(':')[1] || 'image/jpeg';
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType
              }
            });
          }
        }
        
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      // Ensure first message is user if we have system instructions to prepend
      if (contents.length > 0 && contents[0].role !== 'user') {
         contents.unshift({
           role: 'user',
           parts: [{ text: systemInstruction }]
         });
      }

      const response = await ai.models.generateContent({
        model: settings.model || "gemini-2.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      });
      text = response.text || '{}';
    }

    const parsed = safeParseJSON(text);
    if (parsed && parsed.message) {
      return parsed as ChatResponse;
    }
    
    return { message: "I'm sorry, I couldn't process that request properly." };
  } catch (error) {
    console.error("Chat AI error:", error);
    return { message: "I encountered an error while trying to respond. Please try again." };
  }
}


