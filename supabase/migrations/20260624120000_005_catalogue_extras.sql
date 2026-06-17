-- Catalogue import extras + categories + todos (Firestore → Supabase)

CREATE TABLE IF NOT EXISTS categories (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  categories JSONB DEFAULT '[]',
  target_platforms JSONB DEFAULT '[]',
  titles JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS kit_data JSONB DEFAULT '{}';
ALTER TABLE short_links ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS applet_data JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS inventory_maps (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  links JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_overviews (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  overview TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalogue_import_state (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  crawl_job_id TEXT,
  processed_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  due_time TEXT,
  priority TEXT DEFAULT 'medium',
  project TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_profile ON todos(profile_id);
CREATE INDEX IF NOT EXISTS idx_todos_business ON todos(business_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_import_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (is_business_member(business_id) OR is_business_owner(business_id));

CREATE POLICY "categories_write" ON categories FOR ALL
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "inventory_maps_select" ON inventory_maps FOR SELECT
  USING (is_business_member(business_id) OR is_business_owner(business_id));

CREATE POLICY "inventory_maps_write" ON inventory_maps FOR ALL
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "brand_overviews_select" ON brand_overviews FOR SELECT
  USING (is_business_member(business_id) OR is_business_owner(business_id));

CREATE POLICY "brand_overviews_write" ON brand_overviews FOR ALL
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "catalogue_import_state_select" ON catalogue_import_state FOR SELECT
  USING (is_business_member(business_id) OR is_business_owner(business_id));

CREATE POLICY "catalogue_import_state_write" ON catalogue_import_state FOR ALL
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "todos_select" ON todos FOR SELECT
  USING (profile_id = current_profile_id());

CREATE POLICY "todos_write" ON todos FOR ALL
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());
