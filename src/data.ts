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
  shareRestriction?: 'guest' | 'authenticated';
  createdAt: string;
  updatedAt: string;
  oneDriveCredentials?: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    connectedAt: string;
  };
}

export const OUTLETS = [
  'Rainbow Living Mall',
  'Rainbow Buildware',
  'Rainbow Office System',
  'Rainbow Design Studio'
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

export const initialPosts: Post[] = [
  { "id": uuidv4(), "date": "2025-04-01", "outlet": "Rainbow Buildware", "type": "Tiles & Flooring", "title": "NEW TILES JUST LANDED — Floor & Wall Collection", "brief": "Show 3-4 tile styles side by side. Bold headline: 'NEW ARRIVALS'. Add rainbow.com URL", "caption": "Fresh floors, fresh start 🏠✨ Our new floor and wall tile collection is here... browse all 115+ tile options at rainbow.com", "hashtags": "#NewArrival #Tiles #FlooringMV #RainbowBuildware" },
  { "id": uuidv4(), "date": "2025-04-03", "outlet": "Rainbow Buildware", "type": "Behind the Scenes", "title": "BEHIND THE SCENES — Inside the Tile Showroom", "brief": "Real photo of tile display area. Overlay text: 'BEHIND THE SHOWROOM 👀'. Casual, authentic feel.", "caption": "Ever wonder how we set up the showroom? 👀 Come in and see what matches your home. 📍 Rainbow Buildware", "hashtags": "#BehindTheScenes #Showroom #RainbowBuildware" },
  { "id": uuidv4(), "date": "2025-04-07", "outlet": "Rainbow Living Mall", "type": "How-To / Tips", "title": "HOW TO PICK THE RIGHT SOFA FOR YOUR HOME", "brief": "3 sections: Measure space, Choose fabric, Pick style. Use Rainbow Living Mall sofas with MVR prices.", "caption": "Buying a sofa? Don't guess — here are 3 things to check first! 🛋️ See our full sofa range from MVR 2,657", "hashtags": "#SofaTips #HowTo #HomeDecor #RainbowLivingMall" },
  { "id": uuidv4(), "date": "2025-04-09", "outlet": "Rainbow Buildware", "type": "Reel / Video", "title": "REEL — Tile Transformation: Before & After", "brief": "Show bare cement floor → same room with new tiles. Fast-cut transitions. End card: 'Transform YOUR space'.", "caption": "Cement floor → stunning tile finish ✨ The right tile completely changes a space. See our full collection at rainbow.com", "hashtags": "#Reel #TileTransformation #BeforeAndAfter" },
  { "id": uuidv4(), "date": "2025-04-12", "outlet": "Rainbow Buildware", "type": "Tiles & Flooring", "title": "SPOTLIGHT — SPC Vinyl Flooring", "brief": "Show 2-3 SPC flooring plank samples. Headline: 'SPC FLOORING — DURABLE. WATERPROOF. STYLISH.'", "caption": "Why SPC flooring? 💡 It's waterproof, scratch-resistant and looks incredible. We have 19 styles in stock right now.", "hashtags": "#SPCFlooring #VinylFlooring #RainbowBuildware" },
  { "id": uuidv4(), "date": "2025-04-14", "outlet": "Rainbow Office System", "type": "Behind the Scenes", "title": "BEHIND THE SCENES — Office Showroom Setup", "brief": "Real photo of Rainbow Office System showroom. Text overlay: 'THIS IS WHERE OFFICES ARE BORN 💼'", "caption": "This is what we do every day — help Maldivian businesses build their dream offices 💼", "hashtags": "#BehindTheScenes #OfficeSetup #RainbowOfficeSystem" },
  { "id": uuidv4(), "date": "2025-04-16", "outlet": "Rainbow Living Mall", "type": "How-To / Tips", "title": "HOW TO STYLE A SMALL BEDROOM — 3 Quick Tips", "brief": "3-panel layout: Light colours, Storage beds, Add a mirror. Headline: 'SMALL BEDROOM? BIG STYLE.'", "caption": "Small bedroom? No problem! 🛏️ Here are 3 designer tricks to make your space feel bigger.", "hashtags": "#BedroomTips #SmallBedroom #RainbowLivingMall" },
  { "id": uuidv4(), "date": "2025-04-19", "outlet": "Rainbow Buildware", "type": "Tiles & Flooring", "title": "TILE SPOTLIGHT — Marble-Effect Wall Tiles", "brief": "Close-up hero shot of marble-look wall tile. Headline: 'AFFORDABLE LUXURY'. 'In Stock Now' badge.", "caption": "Luxury doesn't have to cost a fortune 🤍 Our marble-effect wall tiles give you a premium finish at a smart price.", "hashtags": "#MarbleTile #WallTiles #AffordableLuxury" },
  { "id": uuidv4(), "date": "2025-04-21", "outlet": "Rainbow Office System", "type": "How-To / Tips", "title": "HOW TO SET UP AN ERGONOMIC HOME OFFICE", "brief": "Clean desk setup photo. 4 numbered tips. Headline: 'YOUR PERFECT HOME OFFICE SETUP'", "caption": "Working from home? Your setup matters more than you think! 💻 4 things that make a real difference...", "hashtags": "#HomeOffice #OfficeTips #ErgonomicSetup" },
  { "id": uuidv4(), "date": "2025-04-23", "outlet": "Rainbow Buildware", "type": "Reel / Video", "title": "REEL — How to Choose the Right Tile for Each Room", "brief": "Quick cuts showing different rooms with matching tile types. Trending audio, fast-paced edit.", "caption": "Not all tiles are made equal 🏠 Here's a quick guide on which tile works best for which room...", "hashtags": "#Reel #TileGuide #HowToTile" },
  { "id": uuidv4(), "date": "2025-04-26", "outlet": "Rainbow Living Mall", "type": "Behind the Scenes", "title": "BEHIND THE SCENES — New Stock Arriving", "brief": "Authentic photo: new furniture being unboxed. Text: 'NEW STOCK JUST ARRIVED 📦'", "caption": "New stock day is our favourite day 📦✨ Fresh pieces just arrived at Rainbow Living Mall.", "hashtags": "#BehindTheScenes #NewStock #RainbowLivingMall" },
  { "id": uuidv4(), "date": "2025-04-30", "outlet": "All Outlets", "type": "Rainbow Living Mall", "title": "APRIL RECAP — What Was Your Favourite?", "brief": "4-quadrant grid showing one post from each week. Text: 'APRIL HIGHLIGHTS'.", "caption": "April flew by! 🌟 We want to know — which Rainbow post was YOUR favourite this month? 👇 Comment 1, 2, 3 or 4!", "hashtags": "#AprilRecap #Poll #RainbowEnterprises" }
];

export const strategyNotes = [
  "Focus on high-quality visuals for tiles and furniture.",
  "Use educational content (How-To/Tips) to build trust.",
  "Highlight affordability and stock availability.",
  "Encourage online shopping via forge.com.",
  "Maintain a consistent posting schedule (3x a week)."
];

export const hashtagBank = [
  "#ForgeEnterprises",
  "#ForgeBuildware",
  "#ForgeLivingMall",
  "#ForgeOfficeSystem",
  "#Maldives",
  "#HomeDecorMV",
  "#InteriorDesign",
  "#TilesMV",
  "#FurnitureMV",
  "#OfficeSetup",
  "#HomeImprovement",
  "#Forge"
];
