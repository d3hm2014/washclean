/*
  # Fix Wash Bookings Permissions and Time Slots

  1. Changes
    - Update wash_bookings INSERT policy to prevent mobile_team from creating bookings
    - Clear old wash_center_slots data with incorrect time format
    - Add slot_date and slot_time columns to wash_bookings for direct storage
  
  2. Security
    - Only customer, shop_owner, and admin roles can create wash bookings
    - Mobile team members can only view and update assigned bookings, not create new ones
*/

DROP POLICY IF EXISTS "Users can create wash bookings" ON wash_bookings;

CREATE POLICY "Customers can create wash bookings"
  ON wash_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role IN ('customer', 'shop_owner', 'admin')
    )
  );

DELETE FROM wash_bookings WHERE slot_id IN (
  SELECT id FROM wash_center_slots WHERE slot_time::text LIKE '%.%'
);

DELETE FROM wash_center_slots WHERE slot_time::text LIKE '%.%';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_bookings' AND column_name = 'slot_date'
  ) THEN
    ALTER TABLE wash_bookings ADD COLUMN slot_date date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wash_bookings' AND column_name = 'slot_time'
  ) THEN
    ALTER TABLE wash_bookings ADD COLUMN slot_time time;
  END IF;
END $$;
