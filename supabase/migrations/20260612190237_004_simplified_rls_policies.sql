-- Simplified RLS Policies using helper functions
-- These work seamlessly with Firebase Auth by using get_firebase_uid()

-- Drop old policies first
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "businesses_select" ON businesses;
DROP POLICY IF EXISTS "businesses_insert" ON businesses;
DROP POLICY IF EXISTS "businesses_update" ON businesses;
DROP POLICY IF EXISTS "businesses_delete" ON businesses;
DROP POLICY IF EXISTS "business_members_select" ON business_members;
DROP POLICY IF EXISTS "business_members_insert" ON business_members;
DROP POLICY IF EXISTS "business_members_update" ON business_members;
DROP POLICY IF EXISTS "business_members_delete" ON business_members;
DROP POLICY IF EXISTS "posts_select" ON posts;
DROP POLICY IF EXISTS "posts_insert" ON posts;
DROP POLICY IF EXISTS "posts_update" ON posts;
DROP POLICY IF EXISTS "posts_delete" ON posts;
DROP POLICY IF EXISTS "inventory_select" ON inventory_products;
DROP POLICY IF EXISTS "inventory_insert" ON inventory_products;
DROP POLICY IF EXISTS "inventory_update" ON inventory_products;
DROP POLICY IF EXISTS "inventory_delete" ON inventory_products;
DROP POLICY IF EXISTS "category_counts_select" ON inventory_category_counts;
DROP POLICY IF EXISTS "category_counts_insert" ON inventory_category_counts;
DROP POLICY IF EXISTS "category_counts_update" ON inventory_category_counts;
DROP POLICY IF EXISTS "category_counts_delete" ON inventory_category_counts;
DROP POLICY IF EXISTS "notebooks_select" ON notebooks;
DROP POLICY IF EXISTS "notebooks_insert" ON notebooks;
DROP POLICY IF EXISTS "notebooks_update" ON notebooks;
DROP POLICY IF EXISTS "notebooks_delete" ON notebooks;
DROP POLICY IF EXISTS "brand_kits_select" ON brand_kits;
DROP POLICY IF EXISTS "brand_kits_insert" ON brand_kits;
DROP POLICY IF EXISTS "brand_kits_update" ON brand_kits;
DROP POLICY IF EXISTS "brand_kits_delete" ON brand_kits;
DROP POLICY IF EXISTS "short_links_select" ON short_links;
DROP POLICY IF EXISTS "short_links_insert" ON short_links;
DROP POLICY IF EXISTS "short_links_update" ON short_links;
DROP POLICY IF EXISTS "short_links_delete" ON short_links;
DROP POLICY IF EXISTS "access_requests_select" ON access_requests;
DROP POLICY IF EXISTS "access_requests_insert" ON access_requests;
DROP POLICY IF EXISTS "access_requests_update" ON access_requests;
DROP POLICY IF EXISTS "access_requests_delete" ON access_requests;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;

-- ============================================
-- PROFILES POLICIES
-- ============================================
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (firebase_uid = get_firebase_uid());

CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  WITH CHECK (firebase_uid = get_firebase_uid());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (firebase_uid = get_firebase_uid())
  WITH CHECK (firebase_uid = get_firebase_uid());

-- ============================================
-- BUSINESSES POLICIES
-- ============================================
CREATE POLICY "businesses_select" ON businesses FOR SELECT
  USING (is_business_owner(id) OR is_business_member(id) OR share_restriction = 'guest');

CREATE POLICY "businesses_insert" ON businesses FOR INSERT
  WITH CHECK (owner_id = current_profile_id());

CREATE POLICY "businesses_update" ON businesses FOR UPDATE
  USING (is_business_admin(id))
  WITH CHECK (is_business_admin(id));

CREATE POLICY "businesses_delete" ON businesses FOR DELETE
  USING (is_business_owner(id));

-- ============================================
-- BUSINESS MEMBERS POLICIES
-- ============================================
CREATE POLICY "business_members_select" ON business_members FOR SELECT
  USING (is_business_member(business_id) OR is_business_owner(business_id));

CREATE POLICY "business_members_insert" ON business_members FOR INSERT
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "business_members_update" ON business_members FOR UPDATE
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "business_members_delete" ON business_members FOR DELETE
  USING (is_business_admin(business_id));

-- ============================================
-- POSTS POLICIES
-- ============================================
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    profile_id = current_profile_id()
    OR is_business_member(business_id)
    OR is_hidden_for_others = false
  );

CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (
    profile_id = current_profile_id()
    AND is_business_editor(business_id)
  );

CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING (
    profile_id = current_profile_id()
    OR is_business_editor(business_id)
  )
  WITH CHECK (
    profile_id = current_profile_id()
    OR is_business_editor(business_id)
  );

CREATE POLICY "posts_delete" ON posts FOR DELETE
  USING (
    profile_id = current_profile_id()
    OR is_business_editor(business_id)
  );

-- ============================================
-- INVENTORY PRODUCTS POLICIES
-- ============================================
CREATE POLICY "inventory_select" ON inventory_products FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "inventory_insert" ON inventory_products FOR INSERT
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "inventory_update" ON inventory_products FOR UPDATE
  USING (is_business_editor(business_id))
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "inventory_delete" ON inventory_products FOR DELETE
  USING (is_business_editor(business_id));

-- ============================================
-- INVENTORY CATEGORY COUNTS POLICIES
-- ============================================
CREATE POLICY "category_counts_select" ON inventory_category_counts FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "category_counts_insert" ON inventory_category_counts FOR INSERT
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "category_counts_update" ON inventory_category_counts FOR UPDATE
  USING (is_business_editor(business_id))
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "category_counts_delete" ON inventory_category_counts FOR DELETE
  USING (is_business_editor(business_id));

-- ============================================
-- NOTEBOOKS POLICIES
-- ============================================
CREATE POLICY "notebooks_select" ON notebooks FOR SELECT
  USING (profile_id = current_profile_id());

CREATE POLICY "notebooks_insert" ON notebooks FOR INSERT
  WITH CHECK (
    profile_id = current_profile_id()
    AND is_business_member(business_id)
  );

CREATE POLICY "notebooks_update" ON notebooks FOR UPDATE
  USING (profile_id = current_profile_id())
  WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "notebooks_delete" ON notebooks FOR DELETE
  USING (profile_id = current_profile_id());

-- ============================================
-- BRAND KITS POLICIES
-- ============================================
CREATE POLICY "brand_kits_select" ON brand_kits FOR SELECT
  USING (is_business_member(business_id));

CREATE POLICY "brand_kits_insert" ON brand_kits FOR INSERT
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "brand_kits_update" ON brand_kits FOR UPDATE
  USING (is_business_editor(business_id))
  WITH CHECK (is_business_editor(business_id));

CREATE POLICY "brand_kits_delete" ON brand_kits FOR DELETE
  USING (is_business_owner(business_id));

-- ============================================
-- SHORT LINKS POLICIES
-- ============================================
CREATE POLICY "short_links_select" ON short_links FOR SELECT
  USING (
    profile_id = current_profile_id()
    OR is_business_member(business_id)
  );

CREATE POLICY "short_links_insert" ON short_links FOR INSERT
  WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "short_links_update" ON short_links FOR UPDATE
  USING (
    profile_id = current_profile_id()
    OR is_business_admin(business_id)
  );

CREATE POLICY "short_links_delete" ON short_links FOR DELETE
  USING (
    profile_id = current_profile_id()
    OR is_business_admin(business_id)
  );

-- ============================================
-- ACCESS REQUESTS POLICIES
-- ============================================
CREATE POLICY "access_requests_select" ON access_requests FOR SELECT
  USING (
    profile_id = current_profile_id()
    OR is_business_admin(business_id)
  );

CREATE POLICY "access_requests_insert" ON access_requests FOR INSERT
  WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "access_requests_update" ON access_requests FOR UPDATE
  USING (is_business_admin(business_id))
  WITH CHECK (is_business_admin(business_id));

CREATE POLICY "access_requests_delete" ON access_requests FOR DELETE
  USING (
    profile_id = current_profile_id()
    OR is_business_admin(business_id)
  );

-- ============================================
-- COMMENTS POLICIES
-- ============================================
CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id AND (is_business_member(posts.business_id) OR posts.is_hidden_for_others = false))
  );

CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (profile_id = current_profile_id());

CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (profile_id = current_profile_id());

CREATE POLICY "comments_delete" ON comments FOR DELETE
  USING (
    profile_id = current_profile_id()
    OR EXISTS (SELECT 1 FROM posts WHERE posts.id = comments.post_id AND is_business_admin(posts.business_id))
  );