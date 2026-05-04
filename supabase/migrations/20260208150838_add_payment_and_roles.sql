/*
  # Add Payment System and User Roles

  1. Updates to profiles table
    - Add wash_center_staff role for center employees
  
  2. Add payment fields to bookings
    - payment_status: unpaid, paid, refunded
    - payment_method: online, cash
    - payment_transaction_id: for tracking
  
  3. Add payment fields to wash_bookings
    - Same payment tracking fields
  
  4. Security
    - Update RLS policies for new roles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
END $$;

ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['customer'::text, 'shop_owner'::text, 'mobile_team'::text, 'admin'::text, 'wash_center_staff'::text]));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE bookings 
      ADD COLUMN payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      ADD COLUMN payment_method text DEFAULT 'online' CHECK (payment_method IN ('online', 'cash')),
      ADD COLUMN payment_transaction_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_bookings' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE wash_bookings 
      ADD COLUMN payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      ADD COLUMN payment_method text DEFAULT 'online' CHECK (payment_method IN ('online', 'cash')),
      ADD COLUMN payment_transaction_id text;
  END IF;
END $$;

CREATE POLICY "Wash center staff can view all wash bookings"
  ON wash_bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'wash_center_staff'
    )
  );

CREATE POLICY "Wash center staff can update wash bookings"
  ON wash_bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'wash_center_staff'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'wash_center_staff'
    )
  );

CREATE POLICY "Admin can view all bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can update all bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Mobile team can view their assigned bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    mobile_team_id IN (
      SELECT id FROM mobile_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mobile team can view assigned paid bookings only"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    payment_status = 'paid' AND
    mobile_team_id IN (
      SELECT id FROM mobile_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Mobile team can update their assigned bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    mobile_team_id IN (
      SELECT id FROM mobile_teams WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    mobile_team_id IN (
      SELECT id FROM mobile_teams WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage services"
  ON car_wash_services FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "Admin can manage slots"
  ON wash_center_slots FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );
