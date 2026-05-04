/*
  # Car Wash Service Bookings

  1. New Tables
    - `car_wash_services`: خدمات الغسيل المختلفة
    - `wash_center_slots`: الفترات الزمنية المتاحة
    - `wash_bookings`: حجوزات الغسيل

  2. Security
    - Enable RLS on all tables
    - Users can only view their own bookings
    - Admin can manage services and slots
*/

CREATE TABLE IF NOT EXISTS car_wash_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  description_ar text,
  description_en text,
  price numeric NOT NULL,
  duration_minutes integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wash_center_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  max_capacity integer NOT NULL DEFAULT 1,
  current_bookings integer DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(slot_date, slot_time)
);

CREATE TABLE IF NOT EXISTS wash_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES car_wash_services(id) ON DELETE RESTRICT,
  slot_id uuid NOT NULL REFERENCES wash_center_slots(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE car_wash_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_center_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Car wash services are viewable by everyone"
  ON car_wash_services FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Wash center slots are viewable by everyone"
  ON wash_center_slots FOR SELECT
  TO authenticated
  USING (is_available = true AND slot_date >= CURRENT_DATE);

CREATE POLICY "Users can view their own wash bookings"
  ON wash_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create wash bookings"
  ON wash_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wash bookings"
  ON wash_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO car_wash_services (name_ar, name_en, description_ar, description_en, price, duration_minutes)
VALUES
  ('غسيل أساسي', 'Basic Wash', 'غسيل خارجي وتنظيف داخلي', 'Exterior wash and interior cleaning', 25.00, 30),
  ('غسيل متوسط', 'Standard Wash', 'غسيل شامل مع تجفيف', 'Full wash with drying', 40.00, 45),
  ('غسيل فاخر', 'Premium Wash', 'غسيل فاخر مع تلميع وحماية', 'Premium wash with polish and protection', 60.00, 60),
  ('تلميع وحماية', 'Wax & Protection', 'تلميع الطلاء والحماية من العوامل', 'Paint polish and weather protection', 45.00, 45)
ON CONFLICT DO NOTHING;
