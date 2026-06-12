-- Forge App Schema Migration
-- Replaces Firebase Firestore with structured PostgreSQL tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Tracks user data linked to Firebase Auth UID
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{}',
  theme_preset TEXT,
  ai_settings JSONB DEFAULT '{}'
);

CREATE INDEX idx_profiles_firebase_uid ON profiles(firebase_uid);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================
-- BUSINESSES (WORKSPACES) TABLE
-- ============================================
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  industry TEXT,
  position TEXT,
  target_url TEXT,
  brand_colors JSONB DEFAULT '{"primary": "#2665fd", "secondary": "#6074b9", "accent": "#bd3800"}',
  logo_url TEXT,
  theme_preset TEXT,
  status TEXT DEFAULT 'active',
  
  -- Sharing fields
  share_token TEXT UNIQUE,
  share_short_code TEXT UNIQUE,
  share_restriction TEXT DEFAULT 'guest',
  share_password TEXT,
  share_expires_at TIMESTAMPTZ,
  share_filters JSONB DEFAULT '{}',
  share_analytics JSONB DEFAULT '{"views": 0}',
  
  -- Integration fields
  onedrive_credentials JSONB,
  applets JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_share_token ON businesses(share_token);
CREATE INDEX idx_businesses_share_short_code ON businesses(share_short_code);

-- ============================================
-- BUSINESS MEMBERS TABLE
-- Many-to-many relationship for workspace access
-- ============================================
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'editor', 'viewer'
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  UNIQUE(business_id, profile_id)
);

CREATE INDEX idx_business_members_business ON business_members(business_id);
CREATE INDEX idx_business_members_profile ON business_members(profile_id);

-- ============================================
-- POSTS TABLE (Content Calendar)
-- ============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Content fields
  date DATE NOT NULL,
  outlet TEXT,
  product_category TEXT,
  type TEXT,
  title TEXT,
  brief TEXT,
  caption TEXT,
  hashtags TEXT,
  images TEXT[] DEFAULT '{}',
  link TEXT,
  
  -- Publishing fields
  publish_status TEXT DEFAULT 'draft',
  scheduled_time TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  instagram_post_id TEXT,
  facebook_post_id TEXT,
  publish_error TEXT,
  platforms TEXT[] DEFAULT '{}',
  
  -- AI fields
  is_ai_generated BOOLEAN DEFAULT false,
  ai_provider TEXT,
  framework TEXT,
  
  -- Campaign fields
  campaign_type TEXT,
  campaign_name TEXT,
  
  -- Content format
  content_formats TEXT[] DEFAULT '{}',
  
  -- Approval workflow
  approval_status TEXT DEFAULT 'draft',
  approval_note TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  
  -- Repeat/scheduling
  repeat_enabled BOOLEAN DEFAULT false,
  repeat_interval TEXT,
  last_repeat_date DATE,
  
  -- Analytics
  analytics JSONB DEFAULT '{}',
  
  -- Postcard data
  postcard_data JSONB,
  
  -- Visibility
  is_hidden_for_others BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_business ON posts(business_id);
CREATE INDEX idx_posts_profile ON posts(profile_id);
CREATE INDEX idx_posts_date ON posts(date);
CREATE INDEX idx_posts_status ON posts(publish_status);
CREATE INDEX idx_posts_approval ON posts(approval_status);

-- ============================================
-- INVENTORY PRODUCTS TABLE
-- ============================================
CREATE TABLE inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  subcategory TEXT,
  price DECIMAL(10,2),
  outlet TEXT,
  description TEXT,
  link TEXT,
  image_url TEXT,
  priority TEXT DEFAULT 'medium',
  notes TEXT,
  stock_status TEXT DEFAULT 'in_stock',
  stock_count INTEGER,
  
  -- AI extracted data
  ai_extracted_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_business ON inventory_products(business_id);
CREATE INDEX idx_inventory_category ON inventory_products(category);
CREATE INDEX idx_inventory_outlet ON inventory_products(outlet);
CREATE INDEX idx_inventory_sku ON inventory_products(sku);

-- ============================================
-- INVENTORY CATEGORY COUNTS (Cached aggregations)
-- ============================================
CREATE TABLE inventory_category_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, category)
);

CREATE INDEX idx_category_counts_business ON inventory_category_counts(business_id);

-- ============================================
-- NOTEBOOKS TABLE (Ideas/Notes)
-- ============================================
CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  title TEXT DEFAULT 'Ideas',
  blocks JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  folders JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, profile_id)
);

CREATE INDEX idx_notebooks_business ON notebooks(business_id);
CREATE INDEX idx_notebooks_profile ON notebooks(profile_id);

-- ============================================
-- BRAND KITS TABLE
-- ============================================
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  
  -- Visual identity
  logo_url TEXT,
  secondary_logo_url TEXT,
  brand_colors JSONB DEFAULT '{}',
  typography JSONB DEFAULT '{}',
  
  -- Brand voice
  brand_voice TEXT,
  tone_keywords TEXT[] DEFAULT '{}',
  do_words TEXT[] DEFAULT '{}',
  dont_words TEXT[] DEFAULT '{}',
  
  -- Design guidelines
  design_rules JSONB DEFAULT '{}',
  
  -- AI-generated content
  ai_generated_guide TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_kits_business ON brand_kits(business_id);

-- ============================================
-- SHORT LINKS TABLE
-- ============================================
CREATE TABLE short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  short_code TEXT UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  
  clicks INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_short_links_code ON short_links(short_code);
CREATE INDEX idx_short_links_business ON short_links(business_id);

-- ============================================
-- ACCESS REQUESTS TABLE
-- ============================================
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending',
  requested_role TEXT DEFAULT 'viewer',
  message TEXT,
  
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, profile_id)
);

CREATE INDEX idx_access_requests_business ON access_requests(business_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  content TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_profile ON comments(profile_id);

-- ============================================
-- Enable Row Level Security on all tables
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_category_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;