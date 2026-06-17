-- Repair workspace ownership for 2003ray.dark@gmail.com
-- Run in Supabase SQL Editor if dashboard shows no workspaces after migration.

UPDATE businesses
SET owner_id = (
  SELECT id FROM profiles WHERE firebase_uid = 'WR31B3zXQ7Sla6Pb28sOtTatREu2' LIMIT 1
)
WHERE id IN (
  '476bad32-86a2-467e-9560-0dbb78dddd18',  -- Rainbow Enterprises
  '56bee2bd-d7f8-41fc-9490-f7d7ef409507',  -- Rainbow
  'caf82ac6-a9a5-4a77-b1f5-f8a53abe9f38'   -- Maldives islamic bank
);

-- Verify (expect 3)
SELECT id, name, owner_id
FROM businesses
WHERE owner_id = (
  SELECT id FROM profiles WHERE firebase_uid = 'WR31B3zXQ7Sla6Pb28sOtTatREu2'
);
