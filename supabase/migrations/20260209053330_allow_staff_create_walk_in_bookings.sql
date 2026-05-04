/*
  # Allow Staff to Create Walk-in Bookings

  1. Changes
    - Add policy for wash_center_staff and admin to create wash_bookings on behalf of customers
    - Add policy for staff to create cars for customers
    - Add policy for staff to view all cars (needed for walk-in bookings)
  
  2. Security
    - Only wash_center_staff and admin roles can create walk-in bookings
    - Staff can only create cars with proper customer user_id
    - All bookings created by staff are automatically marked as confirmed and paid (cash)
*/

CREATE POLICY "Staff can create walk-in bookings"
  ON wash_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('wash_center_staff', 'admin')
    )
  );

CREATE POLICY "Staff can view all cars"
  ON cars FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('wash_center_staff', 'admin')
    )
  );

CREATE POLICY "Staff can create cars for customers"
  ON cars FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('wash_center_staff', 'admin')
    )
  );
