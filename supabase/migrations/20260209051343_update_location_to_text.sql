/*
  # Update Location Field Format

  1. Changes
    - Update `location` field in profiles table from JSONB to TEXT
    - Store location as "region_city" format (e.g., "riyadh_riyadh_city")
    - This allows for simple dropdown selection in registration

  2. Notes
    - Location is optional and stores region and city IDs
    - Format: "regionId_cityId"
*/

DO $$
BEGIN
  ALTER TABLE profiles DROP COLUMN IF EXISTS location;
  ALTER TABLE profiles ADD COLUMN location TEXT DEFAULT NULL;
END $$;
