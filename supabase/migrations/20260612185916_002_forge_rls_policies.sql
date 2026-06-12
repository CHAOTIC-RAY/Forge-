-- RLS Policies for Forge App
-- Secures data access based on user authentication

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid()::text = firebase_uid OR id = auth.uid());

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = firebase_uid OR id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid()::text = firebase_uid OR id = auth.uid())
  WITH CHECK (auth.uid()::text = firebase_uid OR id = auth.uid());

-- ============================================
-- BUSINESSES POLICIES
-- Users can CRUD businesses they own or are members of
-- ============================================
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  TO authenticated USING (
    owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR id IN (SELECT business_id FROM business_members bm JOIN profiles p ON bm.profile_id = p.id WHERE p.firebase_uid = auth.uid()::text)
    OR share_restriction = 'guest' -- Public shares
  );

CREATE POLICY "businesses_insert" ON businesses FOR INSERT
  TO authenticated WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "businesses_update" ON businesses FOR UPDATE
  TO authenticated USING (
    owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR id IN (SELECT business_id FROM business_members bm JOIN profiles p ON bm.profile_id = p.id WHERE p.firebase_uid = auth.uid()::text AND bm.role = 'admin')
  )
  WITH CHECK (
    owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR id IN (SELECT business_id FROM business_members bm JOIN profiles p ON bm.profile_id = p.id WHERE p.firebase_uid = auth.uid()::text AND bm.role = 'admin')
  );

CREATE POLICY "businesses_delete" ON businesses FOR DELETE
  TO authenticated USING (
    owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

-- ============================================
-- BUSINESS MEMBERS POLICIES
-- ============================================
CREATE POLICY "business_members_select" ON business_members FOR SELECT
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text))
    OR profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "business_members_insert" ON business_members FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text))
  );

CREATE POLICY "business_members_update" ON business_members FOR UPDATE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text))
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text))
  );

CREATE POLICY "business_members_delete" ON business_members FOR DELETE
  TO authenticated USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text))
  );

-- ============================================
-- POSTS POLICIES
-- ============================================
CREATE POLICY "posts_select" ON posts FOR SELECT
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
    OR is_hidden_for_others = false
  );

CREATE POLICY "posts_insert" ON posts FOR INSERT
  TO authenticated WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    AND (
      business_id IN (
        SELECT bm.business_id FROM business_members bm
        JOIN profiles p ON bm.profile_id = p.id
        WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
      )
      OR business_id IN (
        SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
      )
    )
  );

CREATE POLICY "posts_update" ON posts FOR UPDATE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "posts_delete" ON posts FOR DELETE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

-- ============================================
-- INVENTORY PRODUCTS POLICIES
-- ============================================
CREATE POLICY "inventory_select" ON inventory_products FOR SELECT
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "inventory_insert" ON inventory_products FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "inventory_update" ON inventory_products FOR UPDATE
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "inventory_delete" ON inventory_products FOR DELETE
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

-- ============================================
-- INVENTORY CATEGORY COUNTS POLICIES
-- ============================================
CREATE POLICY "category_counts_select" ON inventory_category_counts FOR SELECT
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "category_counts_insert" ON inventory_category_counts FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "category_counts_update" ON inventory_category_counts FOR UPDATE
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "category_counts_delete" ON inventory_category_counts FOR DELETE
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

-- ============================================
-- NOTEBOOKS POLICIES
-- ============================================
CREATE POLICY "notebooks_select" ON notebooks FOR SELECT
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "notebooks_insert" ON notebooks FOR INSERT
  TO authenticated WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "notebooks_update" ON notebooks FOR UPDATE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  )
  WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "notebooks_delete" ON notebooks FOR DELETE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

-- ============================================
-- BRAND KITS POLICIES
-- ============================================
CREATE POLICY "brand_kits_select" ON brand_kits FOR SELECT
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "brand_kits_insert" ON brand_kits FOR INSERT
  TO authenticated WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "brand_kits_update" ON brand_kits FOR UPDATE
  TO authenticated USING (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT bm.business_id FROM business_members bm
      JOIN profiles p ON bm.profile_id = p.id
      WHERE p.firebase_uid = auth.uid()::text AND bm.role IN ('admin', 'editor')
    )
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "brand_kits_delete" ON brand_kits FOR DELETE
  TO authenticated USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

-- ============================================
-- SHORT LINKS POLICIES
-- ============================================
CREATE POLICY "short_links_select" ON short_links FOR SELECT
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "short_links_insert" ON short_links FOR INSERT
  TO authenticated WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "short_links_update" ON short_links FOR UPDATE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "short_links_delete" ON short_links FOR DELETE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

-- ============================================
-- ACCESS REQUESTS POLICIES
-- ============================================
CREATE POLICY "access_requests_select" ON access_requests FOR SELECT
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "access_requests_insert" ON access_requests FOR INSERT
  TO authenticated WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "access_requests_update" ON access_requests FOR UPDATE
  TO authenticated USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
  );

CREATE POLICY "access_requests_delete" ON access_requests FOR DELETE
  TO authenticated USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
    OR profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

-- ============================================
-- COMMENTS POLICIES
-- ============================================
CREATE POLICY "comments_select" ON comments FOR SELECT
  TO authenticated USING (
    post_id IN (SELECT id FROM posts WHERE is_hidden_for_others = false)
    OR post_id IN (
      SELECT id FROM posts WHERE profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    )
    OR post_id IN (
      SELECT id FROM posts WHERE business_id IN (
        SELECT bm.business_id FROM business_members bm
        JOIN profiles p ON bm.profile_id = p.id
        WHERE p.firebase_uid = auth.uid()::text
      )
    )
  );

CREATE POLICY "comments_insert" ON comments FOR INSERT
  TO authenticated WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "comments_update" ON comments FOR UPDATE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
  );

CREATE POLICY "comments_delete" ON comments FOR DELETE
  TO authenticated USING (
    profile_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
    OR post_id IN (
      SELECT id FROM posts WHERE business_id IN (
        SELECT id FROM businesses WHERE owner_id IN (SELECT id FROM profiles WHERE firebase_uid = auth.uid()::text)
      )
    )
  );

-- ============================================
-- FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_brand_kits_updated_at BEFORE UPDATE ON brand_kits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();