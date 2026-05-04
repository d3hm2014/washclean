-- ================================================
-- ووش كلين - إعداد قاعدة البيانات الكاملة
-- شغّل هذا الملف في Supabase SQL Editor
-- ================================================

-- 1. جدول الملفات الشخصية
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  name text DEFAULT '',
  name_ar text,
  email text,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'mobile_team', 'wash_center_staff', 'admin')),
  avatar_url text,
  preferred_language text DEFAULT 'ar',
  location text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. جدول السيارات
CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  color text NOT NULL DEFAULT '',
  plate_number text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. جدول الفرق المتنقلة
CREATE TABLE IF NOT EXISTS mobile_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  team_name text NOT NULL,
  team_name_ar text,
  current_lat double precision NOT NULL DEFAULT 24.7136,
  current_lng double precision NOT NULL DEFAULT 46.6753,
  is_available boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 5.00,
  total_reviews integer DEFAULT 0,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- 4. دالة حساب المسافة
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R constant double precision := 6371;
  dlat double precision;
  dlng double precision;
  a double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2)^2;
  RETURN R * 2 * atan2(sqrt(a), sqrt(1-a));
END;
$$;

-- 5. جدول الحجوزات المتنقلة
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id),
  booking_type text NOT NULL DEFAULT 'mobile',
  location_lat double precision NOT NULL,
  location_lng double precision NOT NULL,
  location_address text DEFAULT '',
  mobile_team_id uuid REFERENCES mobile_teams(id),
  scheduled_time timestamptz,
  is_asap boolean DEFAULT true,
  estimated_arrival timestamptz,
  price numeric(10,2) NOT NULL DEFAULT 30.00,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('pending','confirmed','assigned','in_progress','completed','cancelled','rejected')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  payment_method text DEFAULT 'online' CHECK (payment_method IN ('online','cash')),
  payment_transaction_id text,
  created_at timestamptz DEFAULT now()
);

-- 6. جدول سجل الحالة
CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  changed_at timestamptz DEFAULT now()
);

-- 7. جدول صور الحجز
CREATE TABLE IF NOT EXISTS booking_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before','after')),
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 8. جدول التقييمات
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  mobile_team_id uuid REFERENCES mobile_teams(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- 9. إعدادات النظام
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- 10. خدمات المغسلة
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

-- 11. حجوزات المغسلة الثابتة
CREATE TABLE IF NOT EXISTS wash_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES car_wash_services(id) ON DELETE RESTRICT,
  slot_id text NOT NULL,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled')),
  notes text,
  price numeric NOT NULL,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid','paid','refunded')),
  payment_method text DEFAULT 'online' CHECK (payment_method IN ('online','cash')),
  payment_transaction_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. جدول أكواد التحقق بالجوال
CREATE TABLE IF NOT EXISTS phone_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile_team_id ON bookings(mobile_team_id);
CREATE INDEX IF NOT EXISTS idx_mobile_teams_available ON mobile_teams(is_available);
CREATE INDEX IF NOT EXISTS idx_booking_photos_booking_id ON booking_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_phone ON phone_auth_codes(phone);
CREATE INDEX IF NOT EXISTS idx_wash_bookings_user_id ON wash_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_wash_bookings_slot ON wash_bookings(slot_date, slot_time);

-- ============ RLS ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_wash_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE wash_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_auth_codes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admin can view all profiles" ON profiles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','wash_center_staff'))
);

-- Cars policies
CREATE POLICY "Users can manage own cars" ON cars FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can view all bookings" ON bookings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','wash_center_staff','mobile_team'))
);
CREATE POLICY "Staff can update bookings" ON bookings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','wash_center_staff','mobile_team'))
);

-- Booking photos policies
CREATE POLICY "Users can manage booking photos" ON booking_photos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid()));
CREATE POLICY "Mobile team can upload photos" ON booking_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

-- Reviews policies
CREATE POLICY "Users can manage own reviews" ON reviews FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Everyone can read reviews" ON reviews FOR SELECT TO authenticated USING (true);

-- Mobile teams policies
CREATE POLICY "Everyone can view mobile teams" ON mobile_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage mobile teams" ON mobile_teams FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Car wash services policies
CREATE POLICY "Everyone can view active services" ON car_wash_services FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admin can manage services" ON car_wash_services FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Wash bookings policies
CREATE POLICY "Users can view own wash bookings" ON wash_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create wash bookings" ON wash_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Staff can view all wash bookings" ON wash_bookings FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','wash_center_staff'))
);
CREATE POLICY "Staff can update wash bookings" ON wash_bookings FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','wash_center_staff'))
);

-- Phone auth codes (service role only via functions)
CREATE POLICY "Allow all on phone_auth_codes" ON phone_auth_codes FOR ALL USING (true);

-- System settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read settings" ON system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can update settings" ON system_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============ Trigger: auto create profile ============
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ Function: create_booking (تخصيص أقرب فريق) ============
CREATE OR REPLACE FUNCTION create_booking(
  p_user_id uuid, p_car_id uuid,
  p_lat double precision, p_lng double precision,
  p_address text DEFAULT '',
  p_is_asap boolean DEFAULT true,
  p_scheduled_time timestamptz DEFAULT NULL
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team_id uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_price numeric := 30.00;
BEGIN
  -- البحث عن أقرب فريق متاح
  SELECT id INTO v_team_id
  FROM mobile_teams
  WHERE is_available = true
  ORDER BY calculate_distance(p_lat, p_lng, current_lat, current_lng) ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_team_available');
  END IF;

  -- تعيين الفريق كمشغول
  UPDATE mobile_teams SET is_available = false WHERE id = v_team_id;

  -- إنشاء الحجز
  v_booking_number := 'MB-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO bookings (
    booking_number, user_id, car_id, booking_type,
    location_lat, location_lng, location_address,
    mobile_team_id, scheduled_time, is_asap,
    estimated_arrival, price, status, payment_status
  ) VALUES (
    v_booking_number, p_user_id, p_car_id, 'mobile',
    p_lat, p_lng, p_address,
    v_team_id,
    CASE WHEN p_is_asap THEN now() ELSE p_scheduled_time END,
    p_is_asap,
    CASE WHEN p_is_asap THEN now() + interval '30 minutes' ELSE p_scheduled_time + interval '15 minutes' END,
    v_price, 'assigned', 'paid'
  ) RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id, 'booking_number', v_booking_number);
END;
$$;

-- ============ Seed Data ============

-- إعدادات النظام
INSERT INTO system_settings (key, value, description) VALUES
  ('mobile_wash_price', '30', 'سعر الغسيل المتنقل'),
  ('asap_wait_minutes', '30', 'وقت الانتظار للخدمة الفورية'),
  ('max_advance_booking_days', '7', 'أقصى مدة للحجز المسبق بالأيام'),
  ('service_zone_radius_km', '15', 'نطاق الخدمة بالكيلومترات'),
  ('default_language', '"ar"', 'اللغة الافتراضية'),
  ('maintenance_mode', 'false', 'وضع الصيانة')
ON CONFLICT (key) DO NOTHING;

-- فرق متنقلة تجريبية
INSERT INTO mobile_teams (team_name, team_name_ar, current_lat, current_lng, is_available, rating) VALUES
  ('Mobile Team 1', 'فريق متنقل ١', 24.7200, 46.6800, true, 4.9),
  ('Mobile Team 2', 'فريق متنقل ٢', 24.6950, 46.7100, true, 4.8),
  ('Mobile Team 3', 'فريق متنقل ٣', 24.7050, 46.6600, true, 4.7),
  ('Mobile Team 4', 'فريق متنقل ٤', 24.7300, 46.7200, true, 4.9)
ON CONFLICT DO NOTHING;

-- خدمات المغسلة
INSERT INTO car_wash_services (name_ar, name_en, description_ar, description_en, price, duration_minutes, is_active) VALUES
  ('غسيل خارجي', 'Exterior Wash', 'غسيل خارجي كامل للسيارة', 'Full exterior car wash', 25, 20, true),
  ('غسيل خارجي وداخلي', 'Full Wash', 'غسيل خارجي وتنظيف داخلي', 'Exterior wash and interior cleaning', 45, 45, true),
  ('تلميع وحماية', 'Polish & Protect', 'تلميع الهيكل الخارجي وحماية الطلاء', 'Body polishing and paint protection', 80, 60, true),
  ('غسيل سريع', 'Quick Wash', 'غسيل سريع للسيارة في أقل وقت', 'Quick car wash in minimum time', 15, 10, true)
ON CONFLICT DO NOTHING;

-- Storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view booking photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'booking-photos');

CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'booking-photos');


ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own booking history" ON booking_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings WHERE id = booking_id AND user_id = auth.uid()));
CREATE POLICY "Authenticated can insert booking history" ON booking_status_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============ Realtime ============
-- تفعيل Realtime للحجوزات (لتتبع الحالة مباشرة)
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE wash_bookings;
