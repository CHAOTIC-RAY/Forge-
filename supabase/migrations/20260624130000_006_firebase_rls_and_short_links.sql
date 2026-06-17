-- Firebase third-party JWT support, session bootstrap, and public short-link resolution

CREATE OR REPLACE FUNCTION get_firebase_uid()
RETURNS TEXT AS $$
DECLARE
  firebase_uid TEXT;
  jwt_iss TEXT;
BEGIN
  firebase_uid := current_setting('request.jwt.firebase_uid', true);
  IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
    RETURN firebase_uid;
  END IF;

  BEGIN
    jwt_iss := coalesce(auth.jwt() ->> 'iss', '');
    IF jwt_iss LIKE 'https://securetoken.google.com/%' THEN
      firebase_uid := auth.jwt() ->> 'sub';
      IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
        RETURN firebase_uid;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    firebase_uid := coalesce(auth.jwt() ->> 'firebase_uid', '');
    IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
      RETURN firebase_uid;
    END IF;
    firebase_uid := current_setting('request.jwt.claims', true)::json->>'firebase_uid';
    IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
      RETURN firebase_uid;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_firebase_uid(uid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('request.jwt.firebase_uid', uid, true);
END;
$$;

GRANT EXECUTE ON FUNCTION set_firebase_uid(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION resolve_short_link(p_short_code text)
RETURNS SETOF short_links
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM short_links WHERE short_code = p_short_code LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION resolve_short_link(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION increment_short_link_clicks(link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE short_links
  SET clicks = coalesce(clicks, 0) + 1,
      last_clicked_at = now()
  WHERE id = link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_short_link_clicks(uuid) TO anon, authenticated;
