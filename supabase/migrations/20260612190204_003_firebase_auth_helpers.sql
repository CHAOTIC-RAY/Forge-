-- Function to get Firebase UID from session or JWT claims
-- This allows RLS policies to work with Firebase auth

CREATE OR REPLACE FUNCTION get_firebase_uid()
RETURNS TEXT AS $$
DECLARE
  firebase_uid TEXT;
BEGIN
  -- Try to get from session config
  firebase_uid := current_setting('request.jwt.firebase_uid', true);
  
  IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
    RETURN firebase_uid;
  END IF;
  
  -- Fall back to JWT claims if available
  BEGIN
    firebase_uid := current_setting('request.jwt.claims', true)::json->>'firebase_uid';
    IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
      RETURN firebase_uid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create an index on profiles.firebase_uid for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_firebase_uid ON profiles(firebase_uid);

-- Helper function to check if user is owner of a business
CREATE OR REPLACE FUNCTION is_business_owner(business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM businesses b
    JOIN profiles p ON b.owner_id = p.id
    WHERE b.id = business_id
    AND p.firebase_uid = get_firebase_uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is a member of a business
CREATE OR REPLACE FUNCTION is_business_member(business_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_members bm
    JOIN profiles p ON bm.profile_id = p.id
    WHERE bm.business_id = business_id_param
    AND p.firebase_uid = get_firebase_uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin of a business
CREATE OR REPLACE FUNCTION is_business_admin(business_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_members bm
    JOIN profiles p ON bm.profile_id = p.id
    WHERE bm.business_id = business_id_param
    AND p.firebase_uid = get_firebase_uid()
    AND bm.role = 'admin'
  ) OR is_business_owner(business_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is editor of a business
CREATE OR REPLACE FUNCTION is_business_editor(business_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM business_members bm
    JOIN profiles p ON bm.profile_id = p.id
    WHERE bm.business_id = business_id_param
    AND p.firebase_uid = get_firebase_uid()
    AND bm.role IN ('admin', 'editor')
  ) OR is_business_owner(business_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to get current user's profile ID
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id FROM profiles WHERE firebase_uid = get_firebase_uid() LIMIT 1;
  RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;