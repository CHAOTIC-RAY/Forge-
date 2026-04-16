import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AutoSuggest } from '../AutoSuggest';
import { ForgeLoader } from '../ForgeLoader';
import { X, Upload, Image as ImageIcon, Trash2, Wand2, MessageSquare, Send, Share2, CheckCircle2, AlertCircle, Clock, Repeat, BarChart3, Palette, Sparkles, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Post, OUTLETS, PRODUCT_CATEGORIES } from '../../data';
import { v4 as uuidv4 } from 'uuid';
import { generatePostContent, generateMockupImage, generatePostFromImage, generateAiImage, generateHashtagSuggestions, generatePostWithFramework, findProductsByCategory, HighStockProduct, generateSmartPost, generatePostVisuals, generateSmartBrief, getAiSettings } from '../../lib/gemini';
import { createImageCollage, cn, getAnalyticsSettings } from '../../lib/utils';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { format, parseISO, isValid } from 'date-fns';

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: any;
}

interface PostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  selectedDate: string | null;
  onSave?: (post: Post) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  user?: User | null;
  googleTokens?: {access_token: string, refresh_token?: string, expires_in: number} | null;
  initialProducts?: HighStockProduct[];
  activeBusiness?: any;
  posts: Post[];
  dbMode?: 'product' | 'info';
  droppedImages?: string[];
  onImagesConsumed?: () => void;
}


export function PostModal({ isOpen, onClose, post, selectedDate, onSave, onDelete, readOnly = false, user, googleTokens, initialProducts, activeBusiness, posts, dbMode = 'product', droppedImages, onImagesConsumed }: PostModalProps) {
  const [formData, setFormData] = useState<Partial<Post>>({});
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [isGeneratingMockup, setIsGeneratingMockup] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [isGeneratingAiImage, setIsGeneratingAiImage] = useState(false);
  const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState<{[key: number]: boolean}>({});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentView, setCommentView] = useState<'list' | 'time'>('list');
  const [searchResults, setSearchResults] = useState<HighStockProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [workspaceCategories, setWorkspaceCategories] = useState<any[]>([]);
  const [workspaceTargetPlatforms, setWorkspaceTargetPlatforms] = useState<string[]>([]);
  const [workspaceTitles, setWorkspaceTitles] = useState<{ [key: string]: string }>({
    category: 'Product Category',
    outlet: 'Outlet',
    campaign: 'Campaign Type',
    type: 'Type'
  });

  // Handle external image drops
  useEffect(() => {
    if (isOpen && droppedImages && droppedImages.length > 0) {
      setFormData(prev => ({ ...prev, images: [...(prev.images || []), ...droppedImages] }));
      onImagesConsumed?.();
    }
  }, [isOpen, droppedImages, onImagesConsumed]);

  useEffect(() => {
    if (isOpen && activeBusiness?.id) {
      const docRef = doc(db, 'categories', activeBusiness.id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setWorkspaceCategories(data.categories || []);
          setWorkspaceTargetPlatforms(data.targetPlatforms || []);
          if (data.titles) {
            setWorkspaceTitles(prev => ({ ...prev, ...data.titles }));
          }
        } else {
          setWorkspaceCategories([]);
          setWorkspaceTargetPlatforms([]);
          setWorkspaceTitles({
            category: 'Product Category',
            outlet: 'Outlet',
            campaign: 'Campaign Type',
            type: 'Type'
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `categories/${activeBusiness.id}`);
      });
      return () => unsubscribe();
    }
  }, [isOpen, activeBusiness?.id]);

  const isAdmin = user?.email?.toLowerCase() === '2003ray.dark@gmail.com';

  useEffect(() => {
    if (isOpen && post?.id) {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', post.id),
        where('businessId', '==', post.businessId),
        orderBy('createdAt', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const commentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(commentsData);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'comments');
      });

      return () => unsubscribe();
    }
  }, [isOpen, post?.id]);

  useEffect(() => {
    if (isOpen) {
      if (post) {
        setFormData(post);
      } else {
        const analyticsSettings = getAnalyticsSettings();
        setFormData({
          id: uuidv4(),
          date: selectedDate || new Date().toISOString().split('T')[0],
          outlet: OUTLETS[0],
          type: 'Tiles & Flooring',
          title: initialProducts ? initialProducts.map(p => p.title).join(', ') : '',
          brief: initialProducts ? initialProducts.map(p => `${p.title} (${p.price})`).join('\n') : '',
          caption: '',
          hashtags: '',
          images: initialProducts ? initialProducts.map(p => p.link || '').filter(Boolean) : [],
          link: initialProducts && initialProducts.length > 0 ? initialProducts[0].link : '',
          platforms: analyticsSettings.targetPlatforms,
          campaignType: 'non-boosted'
        });
      }
    }
  }, [isOpen, post, selectedDate, initialProducts]);

  // Remove early return so AnimatePresence can handle unmounting
  // if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      
      // If Google Drive is connected, we can offer to upload there
      // But for now, we'll just load them as base64 for local preview
      const base64Images = await Promise.all(
        files.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...base64Images]
      }));
    }
  };

  const uploadToDrive = async (index: number) => {
    if (!googleTokens || !formData.images || !formData.images[index]) return;
    
    const base64Data = formData.images[index];
    if (!base64Data.startsWith('data:')) return; // Already a URL?

    setIsUploadingToDrive(prev => ({ ...prev, [index]: true }));
    try {
      const fileName = `rainbow_post_${post?.id || uuidv4()}_${index}.png`;
      const mimeType = base64Data.split(';')[0].split(':')[1];
      
      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: googleTokens.access_token,
          fileName,
          mimeType,
          base64Data
        })
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      
      // Update the image URL in the form data
      // Note: Google Drive file IDs need a specific URL format to be viewable
      // For now, we'll just use a placeholder or the file ID
      const driveUrl = `https://lh3.googleusercontent.com/u/0/d/${data.id}`;
      
      setFormData(prev => {
        const newImages = [...(prev.images || [])];
        newImages[index] = driveUrl;
        return { ...prev, images: newImages };
      });
      
      toast.success("Uploaded to Google Drive!");
    } catch (error) {
      console.error("Drive upload failed:", error);
      toast.error("Failed to upload to Google Drive.");
    } finally {
      setIsUploadingToDrive(prev => ({ ...prev, [index]: false }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post?.id) return;

    setIsSubmittingComment(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        businessId: post.businessId,
        userId: user?.uid || 'guest',
        userName: user?.displayName || 'Guest User',
        userPhoto: user?.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error("Failed to add comment:", error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!isAdmin) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    if (formData.title && formData.date && onSave) {
      onSave(formData as Post);
      onClose();
    }
  };

  const handleSmartBrief = async () => {
    if (!formData.title) {
      toast.warning("Please provide a title first.");
      return;
    }
    setIsGeneratingContent(true);
    try {
      // Get recent posts for context
      const recentPosts = posts.slice(0, 5);
      const brief = await generateSmartBrief(formData.title, recentPosts, activeBusiness);
      setFormData(prev => ({ ...prev, brief }));
      toast.success("Smart brief generated!");
    } catch (e) {
      console.error("Failed to generate smart brief", e);
      toast.error("Failed to generate smart brief.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSmartGenerate = async () => {
    if (!formData.outlet) return;
    setIsGeneratingContent(true);
    try {
      const content = await generateSmartPost(
        formData.title || '',
        formData.productCategory || '',
        formData.outlet,
        formData.type || '',
        formData.link || '',
        initialProducts || [],
        dbMode,
        activeBusiness
      );
      setFormData(prev => ({
        ...prev,
        title: content.title || prev.title,
        brief: content.brief || prev.brief,
        caption: content.caption || prev.caption,
        hashtags: content.hashtags || prev.hashtags,
        type: content.type || prev.type,
        outlet: content.outlet || prev.outlet,
      }));
      toast.success("AI generated post details!");
    } catch (error) {
      console.error("Smart generation failed:", error);
      toast.error("Failed to generate content.");
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleSmartVisuals = async () => {
    if (!formData.title || !formData.brief) {
      toast.warning("Please provide a title and brief first.");
      return;
    }
    setIsGeneratingMockup(true);
    try {
      const result = await generatePostVisuals(
        formData.title,
        formData.brief,
        activeBusiness?.brandKit,
        activeBusiness
      );
      const newImages = result.map(r => r.url);
      const provider = result[0]?.provider || 'Gemini';
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...newImages],
        aiProvider: provider
      }));
      toast.success('Visuals generated successfully.');
    } catch (error) {
      console.error("Visuals generation failed:", error);
      toast.error("Failed to generate visuals.");
    } finally {
      setIsGeneratingMockup(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (!formData.caption) {
      toast.warning("Please write a caption first.");
      return;
    }
    setIsGeneratingHashtags(true);
    try {
      const suggestions = await generateHashtagSuggestions(formData.caption);
      if (suggestions.length > 0) {
        setFormData(prev => ({
          ...prev,
          hashtags: (prev.hashtags ? prev.hashtags + ' ' : '') + suggestions.join(' ')
        }));
        toast.success("Hashtags generated!");
      }
    } catch (error) {
      console.error("Hashtag generation failed:", error);
      toast.error("Failed to generate hashtags.");
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!formData.title) {
      toast.warning("Please provide a title first.");
      return;
    }
    setIsGeneratingAiImage(true);
    try {
      const result = await generateAiImage(formData.title, 'photorealistic');
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), result.url],
        aiProvider: result.provider
      }));
      toast.success('AI Image generated successfully.');
    } catch (error) {
      console.error("Failed to generate AI image:", error);
      toast.error("Failed to generate AI image. Please check your API key and try again.");
    } finally {
      setIsGeneratingAiImage(false);
    }
  };

  const handleFetchAnalytics = async (platform: 'instagram' | 'facebook') => {
    const postId = platform === 'instagram' ? formData.instagramPostId : formData.facebookPostId;
    if (!postId) {
      toast.warning(`No ${platform} post ID found.`);
      return;
    }

    setIsFetchingAnalytics(true);
    try {
      const response = await fetch(`/api/analytics/${platform}/${postId}`);
      const data = await response.json();
      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          analytics: {
            ...prev.analytics,
            ...data,
            lastUpdated: new Date().toISOString()
          }
        }));
        toast.success(`${platform.charAt(0).toUpperCase() + platform.slice(1)} analytics updated!`);
      } else {
        toast.error(`Failed to fetch analytics: ${data.error}`);
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
      toast.error("An unexpected error occurred while fetching analytics.");
    } finally {
      setIsFetchingAnalytics(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.id || !formData.caption || !formData.images?.length || !formData.platforms?.length) {
      toast.warning("Please ensure the post has a caption, at least one image, and target platforms selected.");
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: formData.id,
          caption: formData.caption,
          hashtags: formData.hashtags,
          imageUrl: formData.images[0],
          platforms: formData.platforms
        })
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("Published successfully!");
        const updatedData = {
          ...formData,
          publishStatus: 'published' as const,
          publishedAt: new Date().toISOString(),
          instagramPostId: result.instagramPostId,
          facebookPostId: result.facebookPostId
        };
        setFormData(updatedData);
        if (onSave) onSave(updatedData as Post);
      } else {
        toast.error(`Publishing failed: ${result.errors?.join(', ') || result.error}`);
        setFormData(prev => ({ ...prev, publishStatus: 'failed', publishError: result.errors?.join(', ') }));
      }
    } catch (error) {
      console.error("Publish error:", error);
      toast.error("An unexpected error occurred while publishing.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="relative bg-white dark:bg-[#191919] rounded-[24px] shadow-2xl border border-[#E9E9E7] dark:border-[#2E2E2E] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            
            {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-[#E9E9E7] dark:border-[#2E2E2E]">
          <h2 className="text-xl font-bold text-[#37352F] dark:text-[#EBE9ED]">
            {post ? 'Edit Post' : 'New Post'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] rounded-[8px] transition-colors">
            <X className="w-5 h-5 text-[#757681]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="post-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#757681] mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  disabled={readOnly}
                  value={formData.date || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors disabled:opacity-70"
                />
              </div>
              <AutoSuggest
                name="outlet"
                label={workspaceTitles.outlet}
                value={formData.outlet || ''}
                disabled={readOnly}
                onChange={(val) => setFormData(prev => ({ ...prev, outlet: val }))}
                options={[
                  ...(workspaceCategories.filter(c => c.type === 'outlet').length > 0 
                    ? workspaceCategories.filter(c => c.type === 'outlet').map(c => c.name) 
                    : OUTLETS),
                  'All Outlets'
                ]}
                placeholder="Select or type outlet..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AutoSuggest
                name="productCategory"
                label={workspaceTitles.category}
                value={formData.productCategory || ''}
                disabled={readOnly}
                onChange={(val) => setFormData(prev => ({ ...prev, productCategory: val }))}
                options={
                  workspaceCategories.filter(c => c.type === 'category').length > 0 
                    ? workspaceCategories.filter(c => c.type === 'category').map(c => c.name) 
                    : PRODUCT_CATEGORIES
                }
                placeholder="Select or type category..."
              />
              <div>
                <label className="block text-sm font-medium text-[#757681] mb-1">Link (Optional)</label>
                <input
                  type="text"
                  name="link"
                  disabled={readOnly}
                  placeholder="e.g. https://example.com/..."
                  value={formData.link || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors disabled:opacity-70"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AutoSuggest
                name="type"
                label={workspaceTitles.type}
                value={formData.type || ''}
                disabled={readOnly}
                onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
                options={
                  workspaceCategories.filter(c => c.type === 'type').length > 0 
                    ? workspaceCategories.filter(c => c.type === 'type').map(c => c.name) 
                    : ['Post', 'Reel', 'Story']
                }
                placeholder="Select or type format..."
              />
              <AutoSuggest
                name="campaignType"
                label={workspaceTitles.campaign}
                value={formData.campaignType || 'Non-Boosted'}
                disabled={readOnly}
                onChange={(val) => setFormData(prev => ({ ...prev, campaignType: val }))}
                options={
                  workspaceCategories.filter(c => c.type === 'campaign').length > 0 
                    ? workspaceCategories.filter(c => c.type === 'campaign').map(c => c.name) 
                    : ['Non-Boosted', 'Boosted', 'Campaign']
                }
                placeholder="Select or type campaign..."
              />
              <div>
                <label className="block text-sm font-medium text-[#757681] mb-2">Content Format</label>
                <div className="flex flex-wrap gap-2">
                  {['Post', 'Reel', 'Story'].map((format) => (
                    <button
                      key={format}
                      type="button"
                      disabled={readOnly}
                      onClick={() => {
                        const current = formData.contentFormats || [];
                        const next = current.includes(format as any)
                          ? current.filter(f => f !== format)
                          : [...current, format as any];
                        setFormData(prev => ({ ...prev, contentFormats: next }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all",
                        (formData.contentFormats || []).includes(format as any)
                          ? "bg-brand border-brand text-white"
                          : "bg-[#F7F7F5] dark:bg-[#202020] border-[#E9E9E7] dark:border-[#2E2E2E] text-[#757681] hover:border-brand"
                      )}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {formData.campaignType?.toLowerCase() === 'campaign' && (
              <div>
                <label className="block text-sm font-medium text-[#757681] mb-1">Campaign Name</label>
                <input
                  type="text"
                  name="campaignName"
                  disabled={readOnly}
                  value={formData.campaignName || ''}
                  onChange={handleChange}
                  placeholder="Enter campaign name..."
                  className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors disabled:opacity-70"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[#757681]">Title</label>
                {!readOnly && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSmartGenerate}
                      disabled={isGeneratingContent}
                      className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                    >
                      <Wand2 className={`w-3 h-3 ${isGeneratingContent ? 'animate-pulse' : ''}`} />
                      {isGeneratingContent ? 'Generating...' : 'Smart AI Generate'}
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                name="title"
                required
                disabled={readOnly}
                value={formData.title || ''}
                onChange={handleChange}
                placeholder="e.g. NEW TILES JUST LANDED"
                className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors disabled:opacity-70"
              />
            </div>

            {!readOnly && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-[#757681]">Graphic Brief</label>
                  <button
                    type="button"
                    onClick={handleSmartBrief}
                    disabled={isGeneratingContent}
                    className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                  >
                    <Sparkles className={`w-3 h-3 ${isGeneratingContent ? 'animate-pulse' : ''}`} />
                    Smart Brief
                  </button>
                </div>
                <textarea
                  name="brief"
                  rows={3}
                  disabled={readOnly}
                  value={formData.brief || ''}
                  onChange={handleChange}
                  placeholder="Instructions for the designer..."
                  className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none transition-colors disabled:opacity-70"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[#757681]">Caption</label>
                {!readOnly && (
                  <div className="flex items-center gap-2">
                    <select
                      className="text-xs border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] px-2 py-1 outline-none text-[#37352F] dark:text-[#EBE9ED]"
                      onChange={(e) => setFormData(prev => ({ ...prev, framework: e.target.value as any }))}
                      value={formData.framework || 'AIDA'}
                    >
                      <option value="AIDA">AIDA</option>
                      <option value="PAS">PAS</option>
                      <option value="BAB">BAB</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.title) { toast.warning("Please provide a title first."); return; }
                        setIsGeneratingContent(true);
                        try {
                          const caption = await generatePostWithFramework(formData.title, formData.framework || 'AIDA');
                          setFormData(prev => ({ ...prev, caption }));
                          toast.success("Caption generated!");
                        } catch (e) {
                          toast.error("Failed to generate caption.");
                        } finally {
                          setIsGeneratingContent(false);
                        }
                      }}
                      disabled={isGeneratingContent}
                      className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                    >
                      <Wand2 className={`w-3 h-3 ${isGeneratingContent ? 'animate-pulse' : ''}`} />
                      Generate with Framework
                    </button>
                  </div>
                )}
              </div>
              <textarea
                name="caption"
                rows={4}
                disabled={readOnly}
                value={formData.caption || ''}
                onChange={handleChange}
                placeholder="Write your post caption here..."
                className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none resize-none transition-colors disabled:opacity-70"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-[#757681]">Hashtags</label>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={handleGenerateHashtags}
                    disabled={isGeneratingHashtags || !formData.caption}
                    className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-hover disabled:opacity-50 transition-colors"
                  >
                    {isGeneratingHashtags ? <ForgeLoader size={12} /> : <Hash className="w-3 h-3" />}
                    Suggest Hashtags
                  </button>
                )}
              </div>
              <input
                type="text"
                name="hashtags"
                disabled={readOnly}
                value={formData.hashtags || ''}
                onChange={handleChange}
                placeholder="#ForgeEnterprises #Maldives"
                className="w-full px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-colors disabled:opacity-70"
              />
            </div>

            {/* Publishing & Approval Section */}
            <div className="pt-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Approval Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#757681]" />
                    <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Approval Status</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['pending', 'approved', 'rejected'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={readOnly || (!isAdmin && status !== 'pending')}
                        onClick={() => setFormData(prev => ({ ...prev, approvalStatus: status }))}
                        className={cn(
                          "px-3 py-1.5 rounded-[8px] text-xs font-medium border transition-all",
                          formData.approvalStatus === status
                            ? status === 'approved' ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                              : status === 'rejected' ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                              : "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                            : "bg-white dark:bg-[#191919] text-[#757681] border-[#E9E9E7] dark:border-[#2E2E2E] hover:bg-[#F7F7F5]"
                        )}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                  {isAdmin && (
                    <textarea
                      placeholder="Add approval note..."
                      value={formData.approvalNote || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, approvalNote: e.target.value }))}
                      className="w-full px-3 py-2 text-xs border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] focus:ring-2 focus:ring-brand outline-none resize-none"
                      rows={2}
                    />
                  )}
                </div>

                {/* Target Platforms */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#757681]" />
                    <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Target Platforms</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {getAnalyticsSettings().targetPlatforms.map((platform) => (
                      <label key={platform} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          checked={formData.platforms?.includes(platform) || false}
                          onChange={(e) => {
                            const current = formData.platforms || [];
                            const updated = e.target.checked 
                              ? [...current, platform]
                              : current.filter(p => p !== platform);
                            setFormData(prev => ({ ...prev, platforms: updated }));
                          }}
                          className="w-4 h-4 rounded border-[#E9E9E7] dark:border-[#2E2E2E] text-brand focus:ring-brand"
                        />
                        <span className="text-xs font-medium text-[#37352F] dark:text-[#EBE9ED] group-hover:text-brand transition-colors capitalize">
                          {platform}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {!post && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Scheduling */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#757681]" />
                      <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Schedule Publish</h3>
                    </div>
                    <input
                      type="datetime-local"
                      disabled={readOnly}
                      value={formData.scheduledTime || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value, publishStatus: e.target.value ? 'scheduled' : 'draft' }))}
                      className="w-full px-3 py-2 text-xs border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] focus:ring-2 focus:ring-brand outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Publish Status Banner */}
              {formData.publishStatus && formData.publishStatus !== 'draft' && (
                <div className={cn(
                  "p-3 rounded-[8px] flex items-center gap-3 text-xs font-medium",
                  formData.publishStatus === 'published' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : formData.publishStatus === 'failed' ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                )}>
                  {formData.publishStatus === 'published' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <div className="flex-1">
                    <p className="capitalize">{formData.publishStatus}: {formData.publishedAt ? `Published on ${new Date(formData.publishedAt).toLocaleString()}` : formData.publishError || 'Waiting for scheduled time'}</p>
                  </div>
                  {formData.publishStatus === 'failed' && !readOnly && (
                    <button onClick={handlePublish} className="px-3 py-1 bg-red-600 text-white rounded-[6px] hover:bg-red-700 transition-colors">Retry</button>
                  )}
                </div>
              )}
            </div>

            {/* Image Upload Zone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#757681]">Media</label>
                {!readOnly && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSmartVisuals}
                      disabled={isGeneratingMockup || !formData.title || !formData.brief || !formData.caption}
                      className="flex items-center gap-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 disabled:opacity-50 transition-colors"
                      title={(!formData.title || !formData.brief || !formData.caption) ? "Fill title, brief, and caption first" : "Generate Smart Visuals (AI + Mockup + Brand Kit)"}
                    >
                      <Palette className={`w-3 h-3 ${isGeneratingMockup ? 'animate-pulse' : ''}`} />
                      {isGeneratingMockup ? 'Generating...' : 'Generate Smart Visuals'}
                    </button>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {formData.images?.map((img, idx) => (
                  <div key={idx} className="relative aspect-[4/5] rounded-[8px] overflow-hidden border border-[#E9E9E7] dark:border-[#2E2E2E] group cursor-pointer" onClick={() => setEnlargedImage(img)}>
                    <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                    {!readOnly && (
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {googleTokens && img.startsWith('data:') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              uploadToDrive(idx);
                            }}
                            disabled={isUploadingToDrive[idx]}
                            className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                            title="Upload to Google Drive"
                          >
                            {isUploadingToDrive[idx] ? (
                              <ForgeLoader size={12} />
                            ) : (
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M9.25 4L2.25 16L5.25 21L12.25 9L9.25 4Z" fill="white"/>
                                <path d="M14.75 4L21.75 16L18.75 21L11.75 9L14.75 4Z" fill="white"/>
                                <path d="M12.25 9L5.25 21H18.75L21.75 16L14.75 4H9.25L12.25 9Z" fill="white"/>
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(idx);
                          }}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          title="Remove Image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {img.startsWith('https://lh3.googleusercontent.com') && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-blue-500/80 text-white text-[8px] font-bold rounded uppercase tracking-widest">
                        Drive
                      </div>
                    )}
                    {user && formData.aiProvider && img.startsWith('data:') && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-500/80 text-white text-[8px] font-bold rounded uppercase tracking-widest">
                        AI: {formData.aiProvider}
                      </div>
                    )}
                  </div>
                ))}
                
                {!readOnly && (
                  <label className="aspect-[4/5] rounded-[8px] border-2 border-dashed border-[#E9E9E7] dark:border-[#2E2E2E] hover:border-brand hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] transition-colors flex flex-col items-center justify-center cursor-pointer text-[#757681] hover:text-brand">
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-xs font-medium">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-xs text-[#9B9A97] dark:text-[#7D7C78]">Optimized for 1080x1350 (4:5 ratio)</p>
            </div>

              {/* Analytics Section */}
              {formData.publishStatus === 'published' && (
                <div className="pt-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#757681]" />
                      <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Post Analytics</h3>
                    </div>
                    <div className="flex gap-2">
                      {formData.instagramPostId && !readOnly && (
                        <button
                          type="button"
                          onClick={() => handleFetchAnalytics('instagram')}
                          disabled={isFetchingAnalytics}
                          className="text-[10px] font-bold text-brand hover:underline disabled:opacity-50"
                        >
                          Update Instagram
                        </button>
                      )}
                      {formData.facebookPostId && !readOnly && (
                        <button
                          type="button"
                          onClick={() => handleFetchAnalytics('facebook')}
                          disabled={isFetchingAnalytics}
                          className="text-[10px] font-bold text-brand hover:underline disabled:opacity-50"
                        >
                          Update Facebook
                        </button>
                      )}
                    </div>
                  </div>

                  {formData.analytics ? (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                        <p className="text-[10px] font-bold text-[#757681] uppercase mb-1">Reach</p>
                        <p className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">{formData.analytics.reach?.toLocaleString() || '0'}</p>
                      </div>
                      <div className="p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                        <p className="text-[10px] font-bold text-[#757681] uppercase mb-1">Engagement</p>
                        <p className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">{formData.analytics.engagement?.toLocaleString() || '0'}</p>
                      </div>
                      <div className="p-3 bg-[#F7F7F5] dark:bg-[#202020] rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E] text-center">
                        <p className="text-[10px] font-bold text-[#757681] uppercase mb-1">Likes</p>
                        <p className="text-lg font-bold text-[#37352F] dark:text-[#EBE9ED]">{formData.analytics.likes?.toLocaleString() || '0'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#757681] italic">No analytics data yet. Click update to fetch from Meta.</p>
                  )}
                </div>
              )}

              {/* Comments Section */}
            <div className="pt-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#757681]" />
                  <h3 className="text-sm font-bold text-[#37352F] dark:text-[#EBE9ED]">Comments</h3>
                </div>
                <div className="flex bg-[#F7F7F5] dark:bg-[#2E2E2E] p-1 rounded-[8px] border border-[#E9E9E7] dark:border-[#2E2E2E]">
                  <button 
                    type="button"
                    onClick={() => setCommentView('list')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-[6px] transition-all",
                      commentView === 'list' ? "bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#EBE9ED] border border-[#E9E9E7] dark:border-[#3E3E3E]" : "text-[#757681]"
                    )}
                  >
                    List
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCommentView('time')}
                    className={cn(
                      "px-2 py-1 text-[10px] font-bold rounded-[6px] transition-all",
                      commentView === 'time' ? "bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#EBE9ED] border border-[#E9E9E7] dark:border-[#3E3E3E]" : "text-[#757681]"
                    )}
                  >
                    Time
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <p className="text-xs text-[#9B9A97] dark:text-[#7D7C78] italic">No comments yet. Be the first to comment!</p>
                ) : (
                  <div className={cn("space-y-4", commentView === 'time' && "relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E9E9E7] dark:before:bg-[#2E2E2E]")}>
                    {comments.map((comment) => (
                      <div key={comment.id} className={cn("flex gap-3 group relative", commentView === 'time' && "pl-2")}>
                        <div className={cn(
                          "w-8 h-8 rounded-full bg-[#EFEFED] dark:bg-[#2E2E2E] flex-shrink-0 overflow-hidden z-10 border-2",
                          commentView === 'time' ? "border-white dark:border-[#1C1C1C]" : "border-transparent"
                        )}>
                          {comment.userPhoto ? (
                            <img src={comment.userPhoto} alt={comment.userName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-[#757681]">
                              {comment.userName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#37352F] dark:text-[#EBE9ED]">{comment.userName}</span>
                              {commentView === 'time' && (
                                <span className="text-[10px] text-[#757681]">{format(new Date(comment.createdAt), 'HH:mm')}</span>
                              )}
                            </div>
                            {isAdmin && (
                              <button 
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-[#37352F] dark:text-[#EBE9ED] mt-0.5">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCommentSubmit(e as any);
                      }
                    }}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-[#E9E9E7] dark:border-[#2E2E2E] bg-[#F7F7F5] dark:bg-[#202020] text-[#37352F] dark:text-[#EBE9ED] rounded-[8px] text-sm focus:ring-2 focus:ring-brand outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCommentSubmit}
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="p-2 bg-brand text-white rounded-[8px] hover:bg-brand-hover disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-[#E9E9E7] dark:border-[#2E2E2E] bg-white dark:bg-[#191919] flex justify-between items-center">
          {post && onDelete && !readOnly ? (
            <button
              type="button"
              onClick={() => {
                onDelete(post.id);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[8px] transition-colors font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-[#37352F] dark:text-[#EBE9ED] hover:bg-[#EFEFED] dark:hover:bg-[#2E2E2E] bg-white dark:bg-[#191919] rounded-[8px] transition-colors font-medium text-sm border border-[#E9E9E7] dark:border-[#2E2E2E]"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                form="post-form"
                className="px-6 py-2 bg-brand hover:bg-brand-hover text-white rounded-[8px] transition-colors font-medium text-sm"
              >
                Save Post
              </button>
            )}
          </div>
        </div>
        </motion.div>

        {/* Enlarged Image Modal */}
        <AnimatePresence>
        {enlargedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
            onClick={() => setEnlargedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
            >
              <img 
                src={enlargedImage} 
                alt="Enlarged" 
                className="max-w-full max-h-full object-contain rounded-[12px]"
              />
              <button 
                onClick={() => setEnlargedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-[8px] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
      )}
    </AnimatePresence>
  );
}
