-- Read firebase uid from Supabase-signed bridge JWTs

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

    IF jwt_iss LIKE '%supabase.co/auth/v1' THEN
      firebase_uid := coalesce(nullif(auth.jwt() ->> 'firebase_uid', ''), auth.jwt() ->> 'sub');
      IF firebase_uid IS NOT NULL AND firebase_uid != '' THEN
        RETURN firebase_uid;
      END IF;
    END IF;

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
