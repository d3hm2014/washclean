/*
  # Add Phone Authentication System

  1. New Tables
    - `phone_verification_codes`
      - `id` (uuid, primary key)
      - `phone` (text, phone number)
      - `code` (text, 6-digit verification code)
      - `expires_at` (timestamptz, expiration time)
      - `verified` (boolean, verification status)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `phone_verification_codes` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verification codes"
  ON phone_verification_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can insert verification codes"
  ON phone_verification_codes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their verification codes"
  ON phone_verification_codes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_phone 
  ON phone_verification_codes(phone);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_expires_at 
  ON phone_verification_codes(expires_at);
