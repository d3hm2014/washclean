/*
  # Complete MVP Setup - Functions, Seeds, Storage, Realtime

  1. Cleanup
    - Drop duplicate `users` table created by earlier migration
    - Make mobile_teams.user_id nullable (teams are DB-only entities in MVP)

  2. Functions
    - Update `handle_new_user` to capture phone from auth.users.phone
    - Create `create_booking` RPC for atomic team assignment
    - Create `get_setting` helper to read system_settings

  3. Seed Data
    - 5 mobile teams in Riyadh area with Arabic names

  4. Storage
    - Create `booking-photos` public bucket
    - Insert/select policies for authenticated users

  5. Realtime
    - Enable realtime on bookings table for live status updates
*/

DROP TABLE IF EXISTS users CASCADE;

ALTER TABLE mobile_teams ALTER COLUMN user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_setting(p_key text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM system_settings WHERE key = p_key;
$$;

CREATE OR REPLACE FUNCTION create_booking(
  p_user_id uuid,
  p_car_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_address text DEFAULT '',
  p_is_asap boolean DEFAULT true,
  p_scheduled_time timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_estimated_arrival timestamptz;
  v_price numeric;
  v_service_radius numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT (value::text)::numeric INTO v_price
  FROM system_settings WHERE key = 'mobile_wash_price';
  v_price := COALESCE(v_price, 30.00);

  SELECT (value::text)::numeric INTO v_service_radius
  FROM system_settings WHERE key = 'service_radius_km';
  v_service_radius := COALESCE(v_service_radius, 15);

  SELECT mt.id INTO v_team_id
  FROM mobile_teams mt
  WHERE mt.is_available = true
    AND calculate_distance(p_lat, p_lng, mt.current_lat, mt.current_lng) <= v_service_radius
  ORDER BY calculate_distance(p_lat, p_lng, mt.current_lat, mt.current_lng) ASC
  LIMIT 1
  FOR UPDATE OF mt;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_team_available');
  END IF;

  IF p_is_asap THEN
    v_estimated_arrival := now() + interval '30 minutes';
  ELSE
    v_estimated_arrival := p_scheduled_time;
  END IF;

  INSERT INTO bookings (
    user_id, car_id, booking_type,
    location_lat, location_lng, location_address,
    mobile_team_id, scheduled_time, is_asap,
    estimated_arrival, price, status
  ) VALUES (
    p_user_id, p_car_id, 'mobile',
    p_lat, p_lng, p_address,
    v_team_id, COALESCE(p_scheduled_time, now()), p_is_asap,
    v_estimated_arrival, v_price, 'assigned'
  )
  RETURNING id, booking_number INTO v_booking_id, v_booking_number;

  UPDATE mobile_teams SET is_available = false WHERE id = v_team_id;

  INSERT INTO booking_status_history (booking_id, status, changed_by)
  VALUES (v_booking_id, 'assigned', p_user_id);

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'team_id', v_team_id,
    'estimated_arrival', v_estimated_arrival,
    'price', v_price
  );
END;
$$;

INSERT INTO mobile_teams (team_name, team_name_ar, current_lat, current_lng, is_available, rating, total_reviews)
VALUES
  ('Eagle Team', 'فريق النسر', 24.7136, 46.6753, true, 4.8, 124),
  ('Falcon Team', 'فريق الصقر', 24.7400, 46.6500, true, 4.9, 98),
  ('Lightning Team', 'فريق البرق', 24.6900, 46.7100, true, 4.7, 156),
  ('Star Team', 'فريق النجم', 24.7600, 46.6900, true, 4.85, 87),
  ('Lion Team', 'فريق الأسد', 24.7000, 46.6300, true, 4.75, 203)
ON CONFLICT DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can upload to booking-photos'
  ) THEN
    CREATE POLICY "Authenticated users can upload to booking-photos"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'booking-photos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname = 'Authenticated users can read booking-photos'
  ) THEN
    CREATE POLICY "Authenticated users can read booking-photos"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'booking-photos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;