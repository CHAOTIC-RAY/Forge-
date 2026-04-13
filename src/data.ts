import { v4 as uuidv4 } from 'uuid';

export type Post = {
  id: string;
  date: string;           // "YYYY-MM-DD"
  outlet: string;         // "Forge Buildware" | "Forge Living Mall" | "Forge Office System" | "All Outlets"
  productCategory?: string;
  type: string;
  title: string;
  brief: string;
  caption: string;
  hashtags: string;
  images?: string[];      // Firebase Storage URLs
  link?: string;
  userId?: string;
  businessId?: string;

  // Publishing fields
  publishStatus?: 'draft' | 'scheduled' | 'published' | 'failed';
  status?: 'draft' | 'scheduled' | 'published' | 'failed'; // Alias for publishStatus
  scheduledTime?: string;          // ISO string "2025-04-01T09:00:00"
  publishedAt?: string;            // ISO string, set after publish
  instagramPostId?: string;        // From Meta API
  facebookPostId?: string;         // From Meta API
  publishError?: string;           // Error message
  platforms?: string[];

  isAiGenerated?: boolean;
  aiProvider?: string;
  createdAt?: string;

  // Campaign fields
  campaignType?: string;
  campaignName?: string;

  // Content Format fields
  contentFormats?: ('Post' | 'Reel' | 'Story')[];

  // Approval fields
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvalNote?: string;
  submittedAt?: string;
  reviewedAt?: string;

  // Repeat fields
  repeatEnabled?: boolean;
  repeatInterval?: 'weekly' | 'biweekly' | 'monthly';
  lastRepeatDate?: string;

  // Analytics fields
  analytics?: {
    impressions?: number;
    reach?: number;
    engagement?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    lastUpdated?: string;
  };

  // Postcard specific data
  postcardData?: {
    frontText: string;
    backText: string;
    imagePrompt: string;
    imageUrl?: string;
  };
};

export interface PriorityProduct {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
  link?: string;
  sku?: string;
  category?: string;
  price?: string;
  outlet?: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  description?: string;
  industry?: string;
  position?: string;
  targetUrl?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoUrl?: string;
  shareToken?: string;
  shareShortCode?: string;
  shareRestriction?: 'guest' | 'authenticated';
  sharePassword?: string;
  shareExpiresAt?: string;
  shareFilters?: {
    tags?: string[];
    dateRange?: { start: string; end: string };
  };
  shareAnalytics?: {
    views: number;
    lastViewedAt?: string;
  };
  themePreset?: string;
  createdAt: string;
  updatedAt: string;
  members?: string[];
  status?: string;
  oneDriveCredentials?: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    connectedAt: string;
  };
}

export const OUTLETS = [
  'Main Store',
  'Online Shop',
  'Showroom',
  'Warehouse'
];

export const PRODUCT_CATEGORIES = [
  "All Products",
  "Furniture",
  "Building Materials",
  "Office Furniture",
  "Office Chair",
  "Office Table",
  "Kitchen System",
  "Appliances",
  "Living Room",
  "Sofa",
  "Sofa Bed",
  "Arm Chair",
  "Rugs",
  "Coffee Table",
  "Bedroom",
  "Bed Frame",
  "Wardrobe",
  "Mattress",
  "Bedding",
  "Dining",
  "Dining Table",
  "Dining Chair",
  "Tiles",
  "Floor Tile",
  "Wall Tile",
  "SPC Flooring",
  "Paint",
  "Lights",
  "Switches",
  "Roofing",
  "Sanitary",
  "Hardware",
  "Tools"
];

export const initialPosts: Post[] = [];

export const strategyNotes = [
  "Focus on high-quality visuals for your products.",
  "Use educational content (How-To/Tips) to build trust.",
  "Highlight affordability and stock availability.",
  "Encourage online shopping via your website.",
  "Maintain a consistent posting schedule (3x a week)."
];

export const hashtagBank = [
  "#Business",
  "#Growth",
  "#Marketing",
  "#Success",
  "#Innovation"
];
