/*
  # Create Core Schema for CarWash MVP

  1. New Tables
    - `users` - Customer profiles linked to auth.users
      - `id` (uuid, PK, references auth.users)
      - `phone` (text, unique)
      - `name` (text)
      - `role` (text, default 'customer')
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)

    - `cars` - Customer vehicles
      - `id` (uuid, PK)
      - `user_id` (uuid, FK to users)
      - `make`, `model`, `year`, `color`, `plate_number`
      - `is_default` (boolean)
      - `created_at` (timestamptz)

    - `mobile_teams` - Wash teams for mobile service
      - `id` (uuid, PK)
      - `team_name` (text)
      - `current_lat`, `current_lng` (double precision)
      - `is_available` (boolean)
      - `rating` (numeric)
      - `created_at` (timestamptz)

    - `bookings` - Service bookings
      - `id` (uuid, PK)
      - `booking_number` (text, unique)
      - `user_id` (uuid, FK), `car_id` (uuid, FK)
      - `booking_type` (text, 'mobile')
      - `location_lat`, `location_lng`, `location_address`
      - `mobile_team_id` (uuid, FK)
      - `scheduled_time`, `is_asap`, `estimated_arrival`
      - `price` (numeric), `status` (text)
      - `created_at` (timestamptz)

    - `booking_status_history` - Status change log
      - `id`, `booking_id`, `status`, `changed_at`

    - `booking_photos` - Before/after photos
      - `id`, `booking_id`, `photo_url`, `photo_type`, `uploaded_by`, `created_at`

    - `reviews` - Customer ratings
      - `id`, `booking_id` (unique), `user_id`, `mobile_team_id`, `rating`, `comment`, `created_at`

    - `system_settings` - Configuration key-value store
      - `key` (PK), `value`, `description`

  2. Indexes
    - Cars by user, bookings by user/status/team, photos by booking, status history by booking
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text UNIQUE NOT NULL,
  name text DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'mobile_team')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  color text NOT NULL,
  plate_number text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mobile_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  current_lat double precision NOT NULL DEFAULT 24.7136,
  current_lng double precision NOT NULL DEFAULT 46.6753,
  is_available boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 5.00,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id),
  booking_type text NOT NULL DEFAULT 'mobile' CHECK (booking_type = 'mobile'),
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  location_address text DEFAULT '',
  mobile_team_id uuid REFERENCES mobile_teams(id),
  scheduled_time timestamptz,
  is_asap boolean DEFAULT true,
  estimated_arrival timestamptz,
  price numeric(10,2) NOT NULL DEFAULT 30.00,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  uploaded_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id),
  mobile_team_id uuid NOT NULL REFERENCES mobile_teams(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile_team_id ON bookings(mobile_team_id);
CREATE INDEX IF NOT EXISTS idx_mobile_teams_available ON mobile_teams(is_available);
CREATE INDEX IF NOT EXISTS idx_booking_photos_booking_id ON booking_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);