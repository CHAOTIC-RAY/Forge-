import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ForgeLoader } from './ForgeLoader';
import { PenTool, LayoutGrid, Image as ImageIcon, Sparkles, Target, ArrowLeft, Wand2, Plus, X, Link, Play, Save, Link2, Send, Settings } from 'lucide-react';
import { ImageResizerTab } from './ImageResizerTab';
import { LinkShortener } from './LinkShortener';
import { getAi } from '../lib/gemini';
import { toast } from 'sonner';
import { motion } from 'motion/react';

import { Post, Business } from '../data';
import { writeBatch, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useWorkspaceConfig } from '../lib/workspaceConfig';
import { generateBulkPosts, generateGenericText, generateCampaignFromUrl, chatToBuildWidget, ChatMessage, generateAiImage } from '../lib/gemini';
import { CheckCircle2, Search } from 'lucide-react';
import { AutoSuggest } from './AutoSuggest';
import { onSnapshot } from 'firebase/firestore';
import { PRODUCT_CATEGORIES } from '../data';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const extractVariables = (template: string): string[] => {
  const matches = Array.from(template.matchAll(/\{\{([^}]+)\}\}/g));
  return Array.from(new Set(matches.map(m => m[1].trim())));
};

type WidgetType = 'copywriting' | 'frameworks' | 'resizer' | 'bulk' | string | null;

export interface WidgetInput {
  name: string;
  type: 'text' | 'textarea' | 'select' | 'image';
  label: string;
  options?: string[]; // For select type
  required?: boolean;
}

interface CustomWidget {
  id: string;
  title: string;
  description: string;
  promptTemplate: string;
  systemInstruction?: string;
  pinned?: boolean;
  outputType?: 'text' | 'image' | 'html';
  requiresImage?: boolean;
  inputs?: WidgetInput[];
}

interface CreativeStudioTabProps {
  onSavePost?: (post: Post) => Promise<void>;
  userId?: string;
  activeBusiness?: Business | null;
  onOpenSandbox?: () => void;
}

export function CreativeStudioTab({ onSavePost, userId, activeBusiness, onOpenSandbox }: CreativeStudioTabProps) {
  const { config } = useWorkspaceConfig();
  const [activeWidget, setActiveWidget] = useState<WidgetType>(null);
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);

  // Playground State
  const [newWidgetTitle, setNewWidgetTitle] = useState('');
  const [newWidgetDescription, setNewWidgetDescription] = useState('');
  const [newWidgetPrompt, setNewWidgetPrompt] = useState('');
  const [newWidgetSystemInstruction, setNewWidgetSystemInstruction] = useState('');
  const [newWidgetOutputType, setNewWidgetOutputType] = useState<'text' | 'image' | 'html'>('text');
  const [newWidgetRequiresImage, setNewWidgetRequiresImage] = useState(false);
  const [newWidgetInputs, setNewWidgetInputs] = useState<WidgetInput[]>([]);
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [playgroundTestInputs, setPlaygroundTestInputs] = useState<Record<string, string>>({});
  const [playgroundTestImage, setPlaygroundTestImage] = useState<string | null>(null);
  const [playgroundTestResult, setPlaygroundTestResult] = useState('');
  const [isTestingPlayground, setIsTestingPlayground] = useState(false);
  const [builderChatMessages, setBuilderChatMessages] = useState<ChatMessage[]>([]);
  const [builderChatInput, setBuilderChatInput] = useState('');
  const [isBuilderChatting, setIsBuilderChatting] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  const openPlayground = () => {
    setEditingWidgetId(null);
    setNewWidgetTitle('');
    setNewWidgetDescription('');
    setNewWidgetPrompt('Write a {{format}} about {{topic}} in a {{tone}} tone.');
    setNewWidgetOutputType('text');
    setNewWidgetRequiresImage(false);
    setPlaygroundTestInputs({});
    setPlaygroundTestImage(null);
    setPlaygroundTestResult('');
    setBuilderChatMessages([]);
    setBuilderChatInput('');
    setIsPlaygroundOpen(true);
  };

  const editWidget = (widget: CustomWidget, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWidgetId(widget.id);
    setNewWidgetTitle(widget.title);
    setNewWidgetDescription(widget.description);
    setNewWidgetPrompt(widget.promptTemplate);
    setNewWidgetSystemInstruction(widget.systemInstruction || '');
    setNewWidgetOutputType(widget.outputType || 'text');
    setNewWidgetRequiresImage(widget.requiresImage || false);
    setNewWidgetInputs(widget.inputs || []);
    setPlaygroundTestInputs({});
    setPlaygroundTestImage(null);
    setPlaygroundTestResult('');
    setBuilderChatMessages([]);
    setBuilderChatInput('');
    setIsPlaygroundOpen(true);
  };

  const handleTestPlayground = async () => {
    const vars = extractVariables(newWidgetPrompt);
    let finalPrompt = newWidgetPrompt;
    
    if (newWidgetInputs.length > 0) {
      for (const input of newWidgetInputs) {
        if (input.required && !playgroundTestInputs[input.name]) {
          toast.error(`Please provide a value for ${input.label}`);
          return;
        }
        if (playgroundTestInputs[input.name]) {
          finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${input.name}\\}\\}`, 'g'), playgroundTestInputs[input.name]);
        }
      }
    } else {
      for (const v of vars) {
        if (!playgroundTestInputs[v]) {
          toast.error(`Please provide a value for {{${v}}}`);
          return;
        }
        finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), playgroundTestInputs[v]);
      }
    }

    setIsTestingPlayground(true);
    try {
      const sysInstruction = newWidgetSystemInstruction 
        ? `${newWidgetSystemInstruction}\n\n${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
        : `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`;

      if (newWidgetOutputType === 'image') {
        const imageResult = await generateAiImage(finalPrompt, 'photorealistic', activeBusiness || undefined, playgroundTestImage || undefined);
        setPlaygroundTestResult(`![Generated Image](${imageResult.url})`);
      } else if (newWidgetOutputType === 'html') {
        const htmlPrompt = `${finalPrompt}\n\nYou MUST return ONLY valid HTML code. Do not wrap it in markdown code blocks (\`\`\`html). Just return the raw HTML string. Include CSS in <style> tags and JS in <script> tags if needed.`;
        const responseText = await generateGenericText(
          htmlPrompt,
          sysInstruction,
          playgroundTestImage || undefined
        );
        // Clean up markdown if the AI still included it
        let cleanHtml = responseText || "";
        if (cleanHtml.startsWith('```html')) cleanHtml = cleanHtml.substring(7);
        if (cleanHtml.startsWith('```')) cleanHtml = cleanHtml.substring(3);
        if (cleanHtml.endsWith('```')) cleanHtml = cleanHtml.substring(0, cleanHtml.length - 3);
        setPlaygroundTestResult(cleanHtml.trim());
      } else {
        const responseText = await generateGenericText(
          finalPrompt,
          sysInstruction,
          playgroundTestImage || undefined
        );
        setPlaygroundTestResult(responseText || "");
      }
      toast.success("Test completed!");
    } catch (error) {
      console.error("Test failed:", error);
      toast.error("Failed to test prompt.");
    } finally {
      setIsTestingPlayground(false);
    }
  };

  const refinePromptWithAi = async () => {
    if (!newWidgetPrompt) {
      toast.error("Please enter a prompt to refine.");
      return;
    }
    setIsRefiningPrompt(true);
    try {
      const prompt = `Refine the following AI widget prompt template to be more effective, professional, and robust. Keep any existing {{variables}} and you can add new ones if helpful. Prompt: "${newWidgetPrompt}"`;
      const refined = await generateGenericText(
        prompt,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      if (refined) {
        setNewWidgetPrompt(refined.trim());
        toast.success("Prompt refined by AI!");
      }
    } catch (error) {
      console.error("Refinement failed:", error);
      toast.error("Failed to refine prompt.");
    } finally {
      setIsRefiningPrompt(false);
    }
  };

  const handleBuilderChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderChatInput.trim() || isBuilderChatting) return;

    const userMessage: ChatMessage = { role: 'user', content: builderChatInput };
    setBuilderChatMessages(prev => [...prev, userMessage]);
    setBuilderChatInput('');
    setIsBuilderChatting(true);

    try {
      const response = await chatToBuildWidget(
        [...builderChatMessages, userMessage],
        { title: newWidgetTitle, description: newWidgetDescription, promptTemplate: newWidgetPrompt }
      );

      setBuilderChatMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
      
      if (response.title) setNewWidgetTitle(response.title);
      if (response.description) setNewWidgetDescription(response.description);
      if (response.promptTemplate) setNewWidgetPrompt(response.promptTemplate);
      if (response.systemInstruction) setNewWidgetSystemInstruction(response.systemInstruction);
      if (response.outputType) setNewWidgetOutputType(response.outputType);
      if (response.requiresImage !== undefined) setNewWidgetRequiresImage(response.requiresImage);
      if (response.inputs) setNewWidgetInputs(response.inputs);
      
    } catch (error) {
      console.error("Builder chat failed:", error);
      toast.error("Failed to get response from AI Builder.");
    } finally {
      setIsBuilderChatting(false);
    }
  };

  // Custom Widget Execution State
  const [customPromptInputs, setCustomPromptInputs] = useState<Record<string, Record<string, string>>>({});
  const [customImageInputs, setCustomImageInputs] = useState<Record<string, string>>({});
  const [customResults, setCustomResults] = useState<Record<string, string>>({});
  const [isGeneratingCustom, setIsGeneratingCustom] = useState<Record<string, boolean>>({});

  const [pinnedWidgetIds, setPinnedWidgetIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rainbow_custom_widgets');
    if (saved) {
      try {
        setCustomWidgets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom widgets", e);
      }
    }
    const savedPinned = localStorage.getItem('rainbow_pinned_widgets');
    if (savedPinned) {
      try {
        setPinnedWidgetIds(JSON.parse(savedPinned));
      } catch (e) {
        console.error("Failed to parse pinned widgets", e);
      }
    }
  }, []);

  const saveCustomWidgets = (widgets: CustomWidget[]) => {
    setCustomWidgets(widgets);
    localStorage.setItem('rainbow_custom_widgets', JSON.stringify(widgets));
  };

  const togglePinWidget = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = pinnedWidgetIds.includes(id) 
      ? pinnedWidgetIds.filter(pid => pid !== id)
      : [...pinnedWidgetIds, id];
    setPinnedWidgetIds(newPinned);
    localStorage.setItem('rainbow_pinned_widgets', JSON.stringify(newPinned));
    toast.success(newPinned.includes(id) ? "Widget pinned to home tab." : "Widget unpinned.");
  };

  const handleCreateWidget = () => {
    if (!newWidgetTitle || !newWidgetPrompt) {
      toast.error("Title and Prompt Template are required.");
      return;
    }

    if (editingWidgetId) {
      const updatedWidgets = customWidgets.map(w => 
        w.id === editingWidgetId 
          ? { ...w, title: newWidgetTitle, description: newWidgetDescription, promptTemplate: newWidgetPrompt, systemInstruction: newWidgetSystemInstruction, outputType: newWidgetOutputType, requiresImage: newWidgetRequiresImage, inputs: newWidgetInputs }
          : w
      );
      saveCustomWidgets(updatedWidgets);
      toast.success("Widget updated successfully!");
    } else {
      const newWidget: CustomWidget = {
        id: `custom_${Date.now()}`,
        title: newWidgetTitle,
        description: newWidgetDescription || 'Custom AI Widget',
        promptTemplate: newWidgetPrompt,
        systemInstruction: newWidgetSystemInstruction,
        outputType: newWidgetOutputType,
        requiresImage: newWidgetRequiresImage,
        inputs: newWidgetInputs
      };
      saveCustomWidgets([...customWidgets, newWidget]);
      toast.success("Widget published successfully!");
    }
    
    setIsPlaygroundOpen(false);
    setEditingWidgetId(null);
  };

  const handleDeleteWidget = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveCustomWidgets(customWidgets.filter(w => w.id !== id));
    toast.success("Widget deleted.");
  };

  // Copywriting State
  const [copyPrompt, setCopyPrompt] = useState('');
  const [copyResult, setCopyResult] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);

  // Frameworks State
  const [framework, setFramework] = useState<'AIDA' | 'PAS' | 'BAB'>('AIDA');
  const [frameworkProduct, setFrameworkProduct] = useState('');
  const [frameworkResult, setFrameworkResult] = useState('');
  const [isGeneratingFramework, setIsGeneratingFramework] = useState(false);

  // Bulk State
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkCount, setBulkCount] = useState(5);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<Partial<Post>[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isSavingBulk, setIsSavingBulk] = useState(false);

  // URL to Campaign State
  const [campaignUrl, setCampaignUrl] = useState('');
  const [campaignResult, setCampaignResult] = useState<any>(null);
  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [brandKitCategories, setBrandKitCategories] = useState<string[]>([]);

  // Fetch Brand Kit Categories
  useEffect(() => {
    if (!activeBusiness?.id) return;
    const unsubscribe = onSnapshot(doc(db, 'categories', activeBusiness.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.categories && Array.isArray(data.categories)) {
          const names = data.categories
            .filter((c: any) => c.enabled !== false && c.type === 'category')
            .map((c: any) => c.name);
          setBrandKitCategories(names);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `categories/${activeBusiness.id}`);
    });
    return () => unsubscribe();
  }, [activeBusiness?.id]);

  const handleGenerateCampaign = async () => {
    if (!campaignUrl) {
      toast.error("Please enter a URL.");
      return;
    }
    setIsGeneratingCampaign(true);
    try {
      const result = await generateCampaignFromUrl(
        campaignUrl,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      setCampaignResult(result);
      toast.success("Campaign generated successfully!");
    } catch (error) {
      console.error("Campaign generation failed:", error);
      toast.error("Failed to generate campaign.");
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  const handleGenerateBulk = async () => {
    if (!bulkCategory) {
      toast.error("Please enter a category or topic.");
      return;
    }
    setIsGeneratingBulk(true);
    try {
      const posts = await generateBulkPosts(
        bulkCategory, 
        bulkCount, 
        activeBusiness || undefined,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      setGeneratedPosts(posts);
      setSelectedIndices(posts.map((_, i) => i)); // Select all by default
      toast.success(`Generated ${posts.length} post ideas!`);
    } catch (error) {
      console.error("Bulk generation failed:", error);
      toast.error("Failed to generate posts.");
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleSaveBulk = async () => {
    if (!onSavePost) {
      toast.error("Save functionality not available.");
      return;
    }
    setIsSavingBulk(true);
    try {
      const postsToSave = selectedIndices.map(idx => {
        const p = generatedPosts[idx];
        return {
          id: crypto.randomUUID(),
          date: format(new Date(), 'yyyy-MM-dd'),
          outlet: p.outlet || 'All Outlets',
          type: p.type || 'General',
          title: p.title || 'Untitled Post',
          brief: p.brief || '',
          caption: p.caption || '',
          hashtags: p.hashtags || '',
          images: [],
          publishStatus: 'draft',
          userId: userId || 'system',
          businessId: activeBusiness?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Post;
      });

      if (userId && activeBusiness?.id && postsToSave.length > 0) {
        const batch = writeBatch(db);
        postsToSave.forEach(post => {
          const postRef = doc(db, 'posts', post.id);
          batch.set(postRef, { ...post, userId, businessId: activeBusiness.id });
        });
        await batch.commit();
      } else {
        for (const post of postsToSave) {
          await onSavePost(post);
        }
      }
      
      toast.success(`Saved ${postsToSave.length} posts to calendar!`);
      setGeneratedPosts([]);
      setBulkCategory('');
    } catch (error) {
      console.error("Failed to save bulk posts:", error);
      toast.error("Failed to save posts.");
    } finally {
      setIsSavingBulk(false);
    }
  };

  const generateCopy = async () => {
    if (!copyPrompt) {
      toast.error("Please enter a topic or product.");
      return;
    }
    setIsGeneratingCopy(true);
    try {
      const prompt = `You are Travis, an expert AI Copywriter. Write engaging social media copy, a blog post snippet, or ad copy for the following topic/product: ${copyPrompt}. Provide a catchy title, the main body copy, and 3-5 relevant hashtags.`;
      const responseText = await generateGenericText(
        prompt,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      setCopyResult(responseText || "");
      toast.success("Copy generated successfully!");
    } catch (error) {
      console.error("Copy generation failed:", error);
      toast.error("Failed to generate copy.");
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const generateFrameworkCopy = async () => {
    if (!frameworkProduct) {
      toast.error("Please enter a product or service.");
      return;
    }
    setIsGeneratingFramework(true);
    try {
      let prompt = "";
      if (framework === 'AIDA') {
        prompt = `Write marketing copy using the AIDA framework (Attention, Interest, Desire, Action) for: ${frameworkProduct}. Clearly label each section.`;
      } else if (framework === 'PAS') {
        prompt = `Write marketing copy using the PAS framework (Problem, Agitate, Solution) for: ${frameworkProduct}. Clearly label each section.`;
      } else if (framework === 'BAB') {
        prompt = `Write marketing copy using the BAB framework (Before, After, Bridge) for: ${frameworkProduct}. Clearly label each section.`;
      }

      const responseText = await generateGenericText(
        prompt,
        `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
      );
      setFrameworkResult(responseText || "");
      toast.success("Framework copy generated successfully!");
    } catch (error) {
      console.error("Framework generation failed:", error);
      toast.error("Failed to generate framework copy.");
    } finally {
      setIsGeneratingFramework(false);
    }
  };

  const generateCustomWidget = async (widget: CustomWidget) => {
    const vars = extractVariables(widget.promptTemplate);
    let finalPrompt = widget.promptTemplate;
    const inputs = customPromptInputs[widget.id] || {};

    if (widget.inputs && widget.inputs.length > 0) {
      for (const input of widget.inputs) {
        if (input.required && !inputs[input.name]) {
          toast.error(`Please provide a value for ${input.label}`);
          return;
        }
        if (inputs[input.name]) {
          finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${input.name}\\}\\}`, 'g'), inputs[input.name]);
        }
      }
    } else {
      for (const v of vars) {
        if (!inputs[v]) {
          toast.error(`Please provide a value for {{${v}}}`);
          return;
        }
        finalPrompt = finalPrompt.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), inputs[v]);
      }
    }

    setIsGeneratingCustom(prev => ({ ...prev, [widget.id]: true }));
    try {
      const inputImage = customImageInputs[widget.id];
      const sysInstruction = widget.systemInstruction 
        ? `${widget.systemInstruction}\n\n${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`
        : `${config.aiContext.systemInstruction} ${config.aiContext.promptPrefix}`;

      if (widget.outputType === 'image') {
        const imageResult = await generateAiImage(finalPrompt, 'photorealistic', activeBusiness || undefined, inputImage || undefined);
        setCustomResults(prev => ({ ...prev, [widget.id]: `![Generated Image](${imageResult.url})` }));
      } else if (widget.outputType === 'html') {
        const htmlPrompt = `${finalPrompt}\n\nYou MUST return ONLY valid HTML code. Do not wrap it in markdown code blocks (\`\`\`html). Just return the raw HTML string. Include CSS in <style> tags and JS in <script> tags if needed.`;
        const responseText = await generateGenericText(
          htmlPrompt,
          sysInstruction,
          inputImage || undefined
        );
        let cleanHtml = responseText || "";
        if (cleanHtml.startsWith('```html')) cleanHtml = cleanHtml.substring(7);
        if (cleanHtml.startsWith('```')) cleanHtml = cleanHtml.substring(3);
        if (cleanHtml.endsWith('```')) cleanHtml = cleanHtml.substring(0, cleanHtml.length - 3);
        setCustomResults(prev => ({ ...prev, [widget.id]: cleanHtml.trim() }));
      } else {
        const responseText = await generateGenericText(
          finalPrompt,
          sysInstruction,
          inputImage || undefined
        );
        setCustomResults(prev => ({ ...prev, [widget.id]: responseText || "" }));
      }
      toast.success("Generated successfully!");
    } catch (error) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate content.");
    } finally {
      setIsGeneratingCustom(prev => ({ ...prev, [widget.id]: false }));
    }
  };

  const defaultWidgets = [
    {
      id: 'copywriting',
      title: 'AI Copywriting',
      description: 'Automatically write social media captions, blog posts, ad copy, and product descriptions.',
      icon: <PenTool className="w-6 h-6 text-brand" />,
      color: 'bg-brand-bg'
    },
    {
      id: 'frameworks',
      title: 'Marketing Frameworks',
      description: 'Create copy optimized for standard marketing formulas like AIDA, PAS, and BAB.',
      icon: <Target className="w-6 h-6 text-purple-500" />,
      color: 'bg-purple-500/10'
    },
    {
      id: 'resizer',
      title: 'Image Resizer',
      description: 'Quickly resize and crop images for different social media platforms.',
      icon: <ImageIcon className="w-6 h-6 text-pink-500" />,
      color: 'bg-pink-500/10'
    },
    {
      id: 'bulk',
      title: 'Bulk Content Generator',
      description: 'Transform a topic into a week of content ideas instantly. (Available in AI Content Tab)',
      icon: <Wand2 className="w-6 h-6 text-emerald-500" />,
      color: 'bg-emerald-500/10'
    },
    {
      id: 'urlToCampaign',
      title: 'URL to Campaign',
      description: 'Turn any blog post, news article, or webpage into a multi-platform social media campaign.',
      icon: <Link className="w-6 h-6 text-orange-500" />,
      color: 'bg-orange-500/10'
    },
    {
      id: 'shortener',
      title: 'Link Shortener',
      description: 'Create trackable, branded short links for your marketing campaigns.',
      icon: <Link2 className="w-6 h-6 text-indigo-500" />,
      color: 'bg-indigo-500/10'
    }
  ];

  const renderWidgetUI = (widgetId: string) => {
    if (widgetId === 'copywriting') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6">
          <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-bg rounded-[8px] flex items-center justify-center">
                <PenTool className="w-4 h-4 text-brand" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">AI Copywriting</h3>
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Powered by Travis</p>
              </div>
            </div>
            {activeWidget === null && (
              <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
              </button>
            )}
          </div>
          <div className="p-6 space-y-6">
            <textarea
              value={copyPrompt}
              onChange={(e) => setCopyPrompt(e.target.value)}
              placeholder="What do you want to write about? (e.g., 'A new summer collection of sunglasses')"
              className="w-full h-32 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-4 text-sm focus:border-brand outline-none resize-none transition-all text-[#37352F] dark:text-[#EBE9ED]"
            />
            <button
              onClick={generateCopy}
              disabled={isGeneratingCopy || !copyPrompt}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-brand hover:bg-blue-700 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all active:scale-95"
            >
              {isGeneratingCopy ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
              Generate Copy
            </button>

            {copyResult && (
              <div className="mt-6 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4">Generated Result</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                  {copyResult}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (widgetId === 'frameworks') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6">
          <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-[8px] flex items-center justify-center">
                <Target className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">Marketing Frameworks</h3>
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">AIDA, PAS, BAB</p>
              </div>
            </div>
            {activeWidget === null && (
              <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
              </button>
            )}
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['AIDA', 'PAS', 'BAB'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFramework(f)}
                  className={cn(
                    "px-4 py-3 rounded-[12px] text-xs font-bold transition-all border text-left flex flex-col",
                    framework === f 
                      ? "bg-purple-50 dark:bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-400" 
                      : "bg-white dark:bg-[#1A1A1A] border-[#E9E9E7] dark:border-[#3E3E3E] text-[#757681] hover:bg-[#F7F7F5] dark:hover:bg-[#2E2E2E]"
                  )}
                >
                  <span className="font-bold mb-1 text-sm">{f}</span>
                  <span className="text-[10px] opacity-70 font-normal truncate">
                    {f === 'AIDA' && 'Attention, Interest...'}
                    {f === 'PAS' && 'Problem, Agitate...'}
                    {f === 'BAB' && 'Before, After...'}
                  </span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={frameworkProduct}
              onChange={(e) => setFrameworkProduct(e.target.value)}
              placeholder="Enter product or service name..."
              className="w-full bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-4 text-sm focus:border-purple-500 outline-none transition-all text-[#37352F] dark:text-[#EBE9ED]"
            />
            
            <button
              onClick={generateFrameworkCopy}
              disabled={isGeneratingFramework || !frameworkProduct}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all active:scale-95"
            >
              {isGeneratingFramework ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
              Apply Framework
            </button>

            {frameworkResult && (
              <div className="mt-6 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4">Generated Result</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                  {frameworkResult}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (widgetId === 'urlToCampaign') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6">
          <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/10 rounded-[8px] flex items-center justify-center">
                <Link className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">URL to Campaign</h3>
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Multi-platform generation</p>
              </div>
            </div>
            {activeWidget === null && (
              <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
              </button>
            )}
          </div>
          <div className="p-6 space-y-6">
            <input
              type="url"
              value={campaignUrl}
              onChange={(e) => setCampaignUrl(e.target.value)}
              placeholder="Paste a URL (e.g., a blog post, news article, or product page)..."
              className="w-full bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-4 text-sm focus:border-orange-500 outline-none transition-all text-[#37352F] dark:text-[#EBE9ED]"
            />
            
            <button
              onClick={handleGenerateCampaign}
              disabled={isGeneratingCampaign || !campaignUrl}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all active:scale-95"
            >
              {isGeneratingCampaign ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
              Generate Campaign
            </button>

            {campaignResult && (
              <div className="mt-6 space-y-4">
                {campaignResult.twitterThread && (
                  <div className="bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                    <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
                      Twitter Thread
                    </h4>
                    <div className="space-y-3">
                      {campaignResult.twitterThread.map((tweet: string, i: number) => (
                        <div key={i} className="text-sm text-[#37352F] dark:text-[#EBE9ED] bg-white dark:bg-[#1A1A1A] p-3 rounded-[8px] border border-[#E9E9E7] dark:border-[#3E3E3E]">
                          {tweet}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {campaignResult.linkedinPost && (
                  <div className="bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                    <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd"></path></svg>
                      LinkedIn Post
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                      {campaignResult.linkedinPost}
                    </div>
                  </div>
                )}

                {campaignResult.instagramCaption && (
                  <div className="bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                    <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path></svg>
                      Instagram Caption
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                      {campaignResult.instagramCaption}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (widgetId === 'resizer') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden  mb-6 relative">
          {activeWidget === null && (
            <div className="absolute top-4 right-4 z-10">
              <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
              </button>
            </div>
          )}
          <ImageResizerTab />
        </div>
      );
    }

    if (widgetId === 'bulk') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6">
          <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-500/10 rounded-[8px] flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">Bulk Content Generator</h3>
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">Transform a topic into a week of content ideas instantly.</p>
              </div>
            </div>
            {activeWidget === null && (
              <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
              </button>
            )}
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-[#F7F7F5] dark:bg-[#202020] p-5 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8">
                  <label className="block text-[10px] font-black text-[#757681] uppercase tracking-widest mb-1.5 ml-1">Topic or Category</label>
                  <AutoSuggest
                    value={bulkCategory}
                    onChange={(val) => setBulkCategory(val)}
                    options={brandKitCategories.length > 0 ? brandKitCategories : PRODUCT_CATEGORIES}
                    placeholder="e.g., Summer Sale, New Furniture Collection..."
                    className="w-full"
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[10px] font-black text-[#757681] uppercase tracking-widest mb-1.5 ml-1">Post Count</label>
                  <select
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-[#191919] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[12px] px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  >
                    <option value={3}>3 Posts</option>
                    <option value={5}>5 Posts</option>
                    <option value={7}>7 Posts (Full Week)</option>
                    <option value={10}>10 Posts</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateBulk}
                disabled={isGeneratingBulk || !bulkCategory}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all flex items-center justify-center gap-2  "
              >
                {isGeneratingBulk ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
                {isGeneratingBulk ? 'Crafting Content...' : 'Generate Content Strategy'}
              </button>
            </div>

            {generatedPosts.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Generated Post Ideas</h4>
                  <button
                    onClick={handleSaveBulk}
                    disabled={isSavingBulk || selectedIndices.length === 0}
                    className="px-4 py-2 bg-[#37352F] dark:bg-[#EBE9ED] text-white dark:text-[#191919] rounded-[12px] text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 "
                  >
                    {isSavingBulk ? <ForgeLoader size={14} /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Save {selectedIndices.length} to Calendar
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {generatedPosts.map((post, idx) => {
                    const isSelected = selectedIndices.includes(idx);
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          setSelectedIndices(prev => 
                            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                          );
                        }}
                        className={cn(
                          "p-4 rounded-[12px] border transition-all cursor-pointer relative group",
                          isSelected 
                            ? "bg-emerald-50/50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" 
                            : "bg-white dark:bg-[#191919] border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-emerald-200 dark:hover:border-emerald-500/30"
                        )}
                      >
                        <div className="absolute top-4 right-4">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isSelected 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-[#D9D9D7] dark:border-[#3E3E3E] text-transparent group-hover:border-emerald-300"
                          )}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        
                        <div className="pr-8">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                              {post.outlet}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#757681] dark:text-[#9B9A97] bg-[#F7F7F5] dark:bg-[#2E2E2E] px-2 py-0.5 rounded">
                              {post.type}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED] mb-2 line-clamp-2">
                            {post.title}
                          </p>
                          {post.brief && (
                            <p className="text-xs text-[#757681] dark:text-[#9B9A97] line-clamp-2 mb-2 italic">
                              Visual: {post.brief}
                            </p>
                          )}
                          {post.caption && (
                            <p className="text-xs text-[#757681] dark:text-[#9B9A97] line-clamp-2 mb-2">
                              {post.caption}
                            </p>
                          )}
                          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 truncate">
                            {post.hashtags}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (widgetId === 'shortener') {
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden mb-6 h-[600px]">
          <LinkShortener businessId={activeBusiness?.id || ''} />
        </div>
      );
    }

    const customWidget = customWidgets.find(w => w.id === widgetId);
    if (customWidget) {
      const vars = extractVariables(customWidget.promptTemplate);
      
      return (
        <div key={widgetId} className="bg-white dark:bg-[#1A1A1A] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] overflow-hidden flex flex-col mb-6">
          <div className="p-5 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#2E2E2E] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-[8px] flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#37352F] dark:text-[#EBE9ED]">{customWidget.title}</h3>
                <p className="text-xs text-[#757681] dark:text-[#9B9A97]">{customWidget.description}</p>
              </div>
            </div>
            {activeWidget === null && (
              <div className="flex items-center gap-2">
                <button onClick={(e) => editWidget(customWidget, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Edit Widget">
                  <PenTool className="w-4 h-4" />
                </button>
                <button onClick={(e) => togglePinWidget(widgetId, e)} className="text-brand p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-[8px]" title="Unpin Widget">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                </button>
              </div>
            )}
          </div>
          <div className="p-6 space-y-6">
            {customWidget.requiresImage && (
              <div className="space-y-4">
                <label className="block text-xs font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-2">Input Image</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#E9E9E7] dark:border-[#3E3E3E] border-dashed rounded-[12px] cursor-pointer bg-[#F7F7F5] dark:bg-[#151515] hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-6 h-6 mb-2 text-[#757681]" />
                      <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                        {customImageInputs[widgetId] ? 'Image uploaded' : 'Click to upload image'}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCustomImageInputs(prev => ({ ...prev, [widgetId]: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                {customImageInputs[widgetId] && (
                  <div className="mt-2 relative w-full h-32 rounded-[8px] overflow-hidden border border-[#E9E9E7] dark:border-[#3E3E3E]">
                    <img src={customImageInputs[widgetId]} alt="Input" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCustomImageInputs(prev => { const next = {...prev}; delete next[widgetId]; return next; })}
                      className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {customWidget?.inputs && customWidget.inputs.length > 0 ? (
              <div className="space-y-4">
                {customWidget.inputs.map(input => (
                  <div key={input.name}>
                    <label className="block text-xs font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-2">
                      {input.label} {input.required && <span className="text-red-500">*</span>}
                    </label>
                    {input.type === 'textarea' ? (
                      <textarea
                        value={customPromptInputs[widgetId]?.[input.name] || ''}
                        onChange={(e) => setCustomPromptInputs(prev => ({ 
                          ...prev, 
                          [widgetId]: { ...(prev[widgetId] || {}), [input.name]: e.target.value } 
                        }))}
                        placeholder={`Enter ${input.label}...`}
                        className="w-full p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all text-[#37352F] dark:text-[#EBE9ED] min-h-[100px] resize-y"
                      />
                    ) : input.type === 'select' ? (
                      <select
                        value={customPromptInputs[widgetId]?.[input.name] || ''}
                        onChange={(e) => setCustomPromptInputs(prev => ({ 
                          ...prev, 
                          [widgetId]: { ...(prev[widgetId] || {}), [input.name]: e.target.value } 
                        }))}
                        className="w-full p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all text-[#37352F] dark:text-[#EBE9ED]"
                      >
                        <option value="">Select {input.label}...</option>
                        {input.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={customPromptInputs[widgetId]?.[input.name] || ''}
                        onChange={(e) => setCustomPromptInputs(prev => ({ 
                          ...prev, 
                          [widgetId]: { ...(prev[widgetId] || {}), [input.name]: e.target.value } 
                        }))}
                        placeholder={`Enter ${input.label}...`}
                        className="w-full p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all text-[#37352F] dark:text-[#EBE9ED]"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : vars.length > 0 ? (
              <div className="space-y-4">
                {vars.map(v => (
                  <div key={v}>
                    <label className="block text-xs font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-2">{v}</label>
                    <input
                      type="text"
                      value={customPromptInputs[widgetId]?.[v] || ''}
                      onChange={(e) => setCustomPromptInputs(prev => ({ 
                        ...prev, 
                        [widgetId]: { ...(prev[widgetId] || {}), [v]: e.target.value } 
                      }))}
                      placeholder={`Enter ${v}...`}
                      className="w-full p-4 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all text-[#37352F] dark:text-[#EBE9ED]"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-4 rounded-[12px]">
                This widget has no variables. It will generate based purely on its prompt template.
              </div>
            )}
            
            <button
              onClick={() => generateCustomWidget(customWidget)}
              disabled={isGeneratingCustom[widgetId]}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-brand hover:bg-blue-700 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all active:scale-95"
            >
              {isGeneratingCustom[widgetId] ? <ForgeLoader size={16} /> : <Sparkles className="w-4 h-4" />}
              Generate
            </button>

            {customResults[widgetId] && (
              <div className="mt-6 bg-[#F7F7F5] dark:bg-[#2E2E2E] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] p-5">
                <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4">Generated Result</h4>
                {customWidget?.outputType === 'html' ? (
                  <div className="w-full h-[500px] bg-white rounded-[8px] border border-[#E9E9E7] overflow-hidden">
                    <iframe
                      srcDoc={customResults[widgetId]}
                      className="w-full h-full border-none"
                      sandbox="allow-scripts allow-same-origin"
                      title="HTML Output"
                    />
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {customResults[widgetId]}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (isPlaygroundOpen) {
    const vars = extractVariables(newWidgetPrompt);
    
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-[#1A1A1A] rounded-[32px] overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E] ">
        <div className="flex items-center justify-between p-6 bg-[#F7F7F5] dark:bg-[#202020] border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-bg rounded-[12px] flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#37352F] dark:text-white">Playground Builder</h3>
              <p className="text-xs text-[#757681] dark:text-white/40">Design and test your custom AI workflow</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaygroundOpen(false)} 
              className="px-6 py-2.5 text-sm font-bold text-[#757681] hover:text-[#37352F] dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateWidget}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-[12px] text-sm font-bold hover:scale-105 transition-all   active:scale-95"
            >
              <Save className="w-4 h-4" />
              {editingWidgetId ? 'Update Widget' : 'Publish Widget'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Left Panel: Builder Chat */}
          <div className="w-full md:w-1/2 flex flex-col border-r border-[#E9E9E7] dark:border-[#2E2E2E]">
            <div className="p-4 border-b border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020]">
              <h4 className="text-sm font-black text-[#37352F] dark:text-white uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                AI Builder Chat
              </h4>
              <p className="text-xs text-[#757681] dark:text-white/40 mt-1">Describe what you want your widget to do.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {builderChatMessages.length === 0 && (
                <div className="text-center text-[#757681] dark:text-white/40 text-sm mt-10">
                  Hi! I'm the AI Builder. What kind of widget would you like to create today?
                </div>
              )}
              {builderChatMessages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-[16px] p-3 text-sm",
                    msg.role === 'user' 
                      ? "bg-brand text-white rounded-br-none" 
                      : "bg-[#F7F7F5] dark:bg-[#2E2E2E] text-[#37352F] dark:text-[#EBE9ED] rounded-bl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isBuilderChatting && (
                <div className="flex justify-start">
                  <div className="bg-[#F7F7F5] dark:bg-[#2E2E2E] rounded-[16px] rounded-bl-none p-3">
                    <ForgeLoader size={16} />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#1A1A1A]">
              <form 
                onSubmit={handleBuilderChatSubmit}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={builderChatInput}
                  onChange={(e) => setBuilderChatInput(e.target.value)}
                  placeholder="e.g., I want a widget that generates blog post ideas..."
                  className="flex-1 p-3 bg-[#F7F7F5] dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:border-brand transition-all text-[#37352F] dark:text-[#EBE9ED]"
                />
                <button
                  type="submit"
                  disabled={isBuilderChatting || !builderChatInput.trim()}
                  className="p-3 bg-brand text-white rounded-[12px] hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: Preview & Test */}
          <div className="w-full md:w-1/2 overflow-y-auto bg-gray-50 dark:bg-[#151515] flex flex-col">
            <div className="p-6 space-y-8">
              {/* Widget Configuration Preview */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-[#757681] dark:text-white/40" />
                  <h4 className="text-sm font-black text-[#37352F] dark:text-white uppercase tracking-widest">Widget Configuration</h4>
                </div>
                <div className="space-y-4 bg-white dark:bg-[#202020] p-5 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1">Workflow Title</label>
                    <input 
                      type="text" 
                      value={newWidgetTitle}
                      onChange={(e) => setNewWidgetTitle(e.target.value)}
                      placeholder="e.g., Viral Hook Generator"
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1">Description</label>
                    <input 
                      type="text" 
                      value={newWidgetDescription}
                      onChange={(e) => setNewWidgetDescription(e.target.value)}
                      placeholder="What does this module do?"
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1">Output Type</label>
                    <div className="flex gap-2 p-1 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px]">
                      <button
                        onClick={() => setNewWidgetOutputType('text')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-[8px] transition-all",
                          newWidgetOutputType === 'text' 
                            ? "bg-white dark:bg-[#2E2E2E] text-brand shadow-sm" 
                            : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
                        )}
                      >
                        Text Response
                      </button>
                      <button
                        onClick={() => setNewWidgetOutputType('image')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-[8px] transition-all",
                          newWidgetOutputType === 'image' 
                            ? "bg-white dark:bg-[#2E2E2E] text-brand shadow-sm" 
                            : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
                        )}
                      >
                        AI Image
                      </button>
                      <button
                        onClick={() => setNewWidgetOutputType('html')}
                        className={cn(
                          "flex-1 py-2 text-xs font-bold rounded-[8px] transition-all",
                          newWidgetOutputType === 'html' 
                            ? "bg-white dark:bg-[#2E2E2E] text-brand shadow-sm" 
                            : "text-[#757681] hover:text-[#37352F] dark:hover:text-white"
                        )}
                      >
                        HTML App
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1">Input Requirements</label>
                    <label className="flex items-center gap-2 p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={newWidgetRequiresImage}
                        onChange={(e) => setNewWidgetRequiresImage(e.target.checked)}
                        className="w-4 h-4 text-brand rounded border-gray-300 focus:ring-brand"
                      />
                      <span className="text-sm font-medium text-[#37352F] dark:text-[#EBE9ED]">Requires Image Upload</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1">System Instructions (Optional)</label>
                    <textarea 
                      value={newWidgetSystemInstruction}
                      onChange={(e) => setNewWidgetSystemInstruction(e.target.value)}
                      placeholder="e.g., You are an expert copywriter. Always use a professional tone."
                      className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand transition-all dark:text-white min-h-[80px] resize-y"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1 ml-1">
                      <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest">Prompt Template</label>
                      <button 
                        onClick={refinePromptWithAi}
                        disabled={isRefiningPrompt || !newWidgetPrompt}
                        className="text-[10px] font-black text-brand hover:underline flex items-center gap-1 disabled:opacity-50"
                      >
                        {isRefiningPrompt ? <ForgeLoader size={10} /> : <Sparkles className="w-3 h-3" />}
                        Refine
                      </button>
                    </div>
                    <textarea 
                      value={newWidgetPrompt}
                      onChange={(e) => setNewWidgetPrompt(e.target.value)}
                      placeholder="Write a viral social media hook for: {{topic}}"
                      className="w-full h-32 p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:ring-2 focus:ring-brand resize-none transition-all dark:text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Test Mode */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-sm font-black text-[#37352F] dark:text-white uppercase tracking-widest">Live Test Mode</h4>
                </div>

                <div className="space-y-6">
                  {newWidgetRequiresImage && (
                    <div className="space-y-4 bg-white dark:bg-[#202020] p-5 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <h5 className="text-xs font-bold text-[#757681] dark:text-white/40 uppercase tracking-widest mb-4">Input Image</h5>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#E9E9E7] dark:border-[#3E3E3E] border-dashed rounded-[12px] cursor-pointer bg-[#F7F7F5] dark:bg-[#151515] hover:bg-gray-50 dark:hover:bg-[#202020] transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-6 h-6 mb-2 text-[#757681]" />
                            <p className="text-xs text-[#757681] dark:text-[#9B9A97]">
                              {playgroundTestImage ? 'Image uploaded' : 'Click to upload image'}
                            </p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPlaygroundTestImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                      {playgroundTestImage && (
                        <div className="mt-2 relative w-full h-32 rounded-[8px] overflow-hidden border border-[#E9E9E7] dark:border-[#3E3E3E]">
                          <img src={playgroundTestImage} alt="Test Input" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setPlaygroundTestImage(null)}
                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {newWidgetInputs.length > 0 ? (
                    <div className="space-y-4 bg-white dark:bg-[#202020] p-5 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <h5 className="text-xs font-bold text-[#757681] dark:text-white/40 uppercase tracking-widest mb-4">Custom Inputs</h5>
                      {newWidgetInputs.map(input => (
                        <div key={input.name}>
                          <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-1.5">
                            {input.label} {input.required && <span className="text-red-500">*</span>}
                          </label>
                          {input.type === 'textarea' ? (
                            <textarea
                              value={playgroundTestInputs[input.name] || ''}
                              onChange={(e) => setPlaygroundTestInputs(prev => ({ ...prev, [input.name]: e.target.value }))}
                              placeholder={`Test value for ${input.label}...`}
                              className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:border-emerald-500 transition-all text-[#37352F] dark:text-[#EBE9ED] min-h-[80px] resize-y"
                            />
                          ) : input.type === 'select' ? (
                            <select
                              value={playgroundTestInputs[input.name] || ''}
                              onChange={(e) => setPlaygroundTestInputs(prev => ({ ...prev, [input.name]: e.target.value }))}
                              className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:border-emerald-500 transition-all text-[#37352F] dark:text-[#EBE9ED]"
                            >
                              <option value="">Select {input.label}...</option>
                              {input.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={playgroundTestInputs[input.name] || ''}
                              onChange={(e) => setPlaygroundTestInputs(prev => ({ ...prev, [input.name]: e.target.value }))}
                              placeholder={`Test value for ${input.label}...`}
                              className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:border-emerald-500 transition-all text-[#37352F] dark:text-[#EBE9ED]"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : vars.length > 0 ? (
                    <div className="space-y-4 bg-white dark:bg-[#202020] p-5 rounded-[16px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                      <h5 className="text-xs font-bold text-[#757681] dark:text-white/40 uppercase tracking-widest mb-4">Variables Detected</h5>
                      {vars.map(v => (
                        <div key={v}>
                          <label className="block text-[10px] font-black text-[#757681] dark:text-white/40 uppercase tracking-widest ml-1 mb-1.5">{v}</label>
                          <input
                            type="text"
                            value={playgroundTestInputs[v] || ''}
                            onChange={(e) => setPlaygroundTestInputs(prev => ({ ...prev, [v]: e.target.value }))}
                            placeholder={`Test value for ${v}...`}
                            className="w-full p-3 bg-[#F7F7F5] dark:bg-[#151515] border border-[#E9E9E7] dark:border-[#3E3E3E] rounded-[12px] text-sm outline-none focus:border-emerald-500 transition-all text-[#37352F] dark:text-[#EBE9ED]"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 p-4 rounded-[12px] border border-amber-200 dark:border-amber-500/20">
                      No variables detected. Try adding <code className="font-mono bg-amber-100 dark:bg-amber-500/20 px-1 rounded">{"{{topic}}"}</code> to your prompt.
                    </div>
                  )}

                  <button
                    onClick={handleTestPlayground}
                    disabled={isTestingPlayground || !newWidgetPrompt}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-[12px] text-sm font-bold transition-all   active:scale-95"
                  >
                    {isTestingPlayground ? <ForgeLoader size={16} /> : <Play className="w-4 h-4 fill-current" />}
                    Run Test
                  </button>

                  {playgroundTestResult && (
                    <div className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2E2E2E] rounded-[16px] p-5 ">
                      <h4 className="text-[10px] font-bold text-[#757681] dark:text-[#9B9A97] uppercase tracking-widest mb-4">Output</h4>
                      {newWidgetOutputType === 'html' ? (
                        <div className="w-full h-[500px] bg-white rounded-[8px] border border-[#E9E9E7] overflow-hidden">
                          <iframe
                            srcDoc={playgroundTestResult}
                            className="w-full h-full border-none"
                            sandbox="allow-scripts allow-same-origin"
                            title="HTML Output"
                          />
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-[#37352F] dark:text-[#EBE9ED]">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {playgroundTestResult}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeWidget !== null) {
    return (
      <div className="flex flex-col bg-transparent pb-20 md:pb-0 h-full w-full">
        <button 
          onClick={() => setActiveWidget(null)}
          className="flex items-center gap-2 text-sm font-bold text-[#757681] hover:text-[#37352F] dark:hover:text-[#EBE9ED] transition-colors mb-6 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to AI Studio
        </button>

        <div className="w-full">
          {renderWidgetUI(activeWidget)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-transparent pb-20 md:pb-0 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative p-6 md:p-12 border border-white/10 dark:border-white/5 bg-gradient-to-br from-brand/20 via-purple-500/10 to-transparent rounded-[24px] md:rounded-[32px] overflow-hidden mb-8 md:mb-12 group"
      >
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand/20 blur-[100px] rounded-full group-hover:bg-brand/30 transition-colors duration-700" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full group-hover:bg-purple-500/20 transition-colors duration-700" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-4 md:gap-6">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-white/10 backdrop-blur-xl rounded-[12px] md:rounded-[16px] flex items-center justify-center border border-white/20 shrink-0"
            >
              <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-brand" />
            </motion.div>
            <div>
              <h2 className="text-2xl md:text-4xl font-black text-[#37352F] dark:text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-brand to-purple-500">
                AI Studio
              </h2>
              <p className="text-sm md:text-base text-[#757681] dark:text-white/60 mt-1 md:mt-2 max-w-md leading-relaxed">
                The ultimate playground for custom AI workflows. Build, pin, and automate your creative process.
              </p>
            </div>
          </div>
          <button 
            onClick={openPlayground}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 md:px-8 py-3 md:py-4 bg-brand text-white rounded-[12px] md:rounded-[16px] text-sm md:text-base font-black hover:scale-105 transition-all active:scale-95 group/btn"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:rotate-90 transition-transform" />
            Create New Widget
          </button>
        </div>
      </motion.div>

      <div className="space-y-12">
        {pinnedWidgetIds.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-brand rounded-full" />
              <h3 className="text-sm font-black text-[#757681] dark:text-white/40 uppercase tracking-[0.2em]">Pinned Workflows</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 w-full">
              {pinnedWidgetIds.map(id => renderWidgetUI(id))}
            </div>
          </div>
        )}

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-brand rounded-full" />
            <h3 className="text-sm font-black text-[#757681] dark:text-white/40 uppercase tracking-[0.2em]">Available Modules</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {defaultWidgets.map(widget => (
              <div 
                key={widget.id}
                onClick={() => setActiveWidget(widget.id as WidgetType)}
                className="group relative bg-white dark:bg-white/[0.03] backdrop-blur-sm border border-[#E9E9E7] dark:border-white/10 rounded-[24px] md:rounded-[28px] p-6 md:p-8 cursor-pointer hover:border-brand hover:shadow-2xl hover:shadow-brand/20 transition-all duration-500 flex flex-col overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-[16px] flex items-center justify-center mb-4 md:mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 relative z-10", widget.color)}>
                  {widget.icon}
                </div>
                <h3 className="text-lg md:text-xl font-black text-[#37352F] dark:text-white mb-2 md:mb-3 group-hover:text-brand transition-colors relative z-10">{widget.title}</h3>
                <p className="text-xs md:text-sm text-[#757681] dark:text-white/50 leading-relaxed flex-1 relative z-10">{widget.description}</p>
                <div className="mt-4 md:mt-6 flex items-center justify-between relative z-10">
                  <div className="text-[10px] md:text-xs font-black text-brand opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 flex items-center gap-2">
                    Launch Module <LayoutGrid className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F7F7F5] dark:bg-white/5 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </div>
            ))}

            {customWidgets.map(widget => (
              <div 
                key={widget.id}
                onClick={() => setActiveWidget(widget.id)}
                className="group relative bg-white dark:bg-white/[0.03] backdrop-blur-sm border border-[#E9E9E7] dark:border-white/10 rounded-[24px] md:rounded-[28px] p-6 md:p-8 cursor-pointer hover:border-brand hover:shadow-2xl hover:shadow-brand/20 transition-all duration-500 flex flex-col overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 z-20">
                  <button 
                    onClick={(e) => editWidget(widget, e)}
                    className="p-2 text-brand hover:bg-brand-bg rounded-[12px] transition-all hover:scale-110"
                    title="Edit Widget"
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => togglePinWidget(widget.id, e)}
                    className={cn("p-2 rounded-[12px] transition-all hover:scale-110", pinnedWidgetIds.includes(widget.id) ? "text-brand bg-brand-bg" : "text-[#757681] dark:text-white/40 hover:bg-[#F7F7F5] dark:hover:bg-white/10")}
                    title={pinnedWidgetIds.includes(widget.id) ? "Unpin Widget" : "Pin Widget"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={pinnedWidgetIds.includes(widget.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteWidget(widget.id, e)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-[12px] transition-all hover:scale-110"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] flex items-center justify-center mb-4 md:mb-6 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 bg-amber-500/10 relative z-10">
                  <Wand2 className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
                </div>
                <h3 className="text-lg md:text-xl font-black text-[#37352F] dark:text-white mb-2 md:mb-3 group-hover:text-brand transition-colors relative z-10">{widget.title}</h3>
                <p className="text-xs md:text-sm text-[#757681] dark:text-white/50 leading-relaxed flex-1 relative z-10">{widget.description}</p>
                <div className="mt-4 md:mt-6 flex items-center justify-between relative z-10">
                  <div className="text-[10px] md:text-xs font-black text-brand opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 flex items-center gap-2">
                    Run Workflow <LayoutGrid className="w-3 h-3 md:w-4 md:h-4" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#F7F7F5] dark:bg-white/5 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
