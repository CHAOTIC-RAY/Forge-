export interface Post {
  id: string;
  title: string;
  businessId?: string;
  productCategory?: string;
  outlet?: string;
  campaignType?: string;
  type?: string;
  platforms?: string[];
  caption?: string;
  hashtags?: any;
  images?: string[];
  lastRepeatDate?: any;
  publishedAt?: any;
  repeatInterval?: string;
  brief?: string;
  date: string | Date;
  status?: string;
  createdAt?: any;
  updatedAt?: any;
  link?: string;
  instagramPostId?: string;
  facebookPostId?: string;
  analytics?: {
    impressions?: number;
    reach?: number;
    engagement?: number;
    [key: string]: any;
  };
  contentFormats?: any;
  campaignName?: string;
  framework?: string;
  approvalStatus?: string;
  approvalNote?: string;
  scheduledTime?: string;
  publishStatus?: 'draft' | 'error' | 'published' | 'scheduled' | 'publishing';
  publishError?: string;
  aiProvider?: string;
  [key: string]: any;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  memberRoles?: { [userId: string]: string };
  members?: any[];
  industry?: string;
  shareToken?: string;
  logoUrl?: string;
  applets?: any;
  brandVoice?: string;
  colorPreset?: string;
  targetUrl?: string;
  position?: string;
  [key: string]: any;
}

export const OUTLETS: string[] = ['Main Store', 'Digital Store'];
export const PRODUCT_CATEGORIES: string[] = ['All Products', 'Apparel', 'Food', 'General'];
export const initialPosts: Post[] = [];
