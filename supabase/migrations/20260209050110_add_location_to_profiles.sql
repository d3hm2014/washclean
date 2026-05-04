/*
  # Add Location Field to Profiles

  1. Changes
    - Add `location` JSONB column to profiles table to store user location
    - Format: {"lat": number, "lng": number}
    - Optional field for customer convenience

  2. Notes
    - Location is optional and stored as JSONB for flexibility
    - Can be used for mobile wash location selection
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location JSONB DEFAULT NULL;
  END IF;
END $$;
