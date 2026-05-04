/*
  # Simple Phone Authentication System

  1. New Tables
    - `phone_auth_codes`
      - `id` (uuid, primary key)
      - `phone` (text, indexed) - رقم الجوال
      - `code` (text) - رمز التحقق (6 أرقام)
      - `created_at` (timestamp) - وقت الإنشاء
      - `expires_at` (timestamp) - وقت انتهاء الصلاحية
      - `used` (boolean) - هل تم استخدام الرمز

  2. Security
    - Enable RLS
    - لا توجد policies لأن هذا الجدول للنظام فقط
*/

-- حذف الجدول القديم إذا كان موجود
DROP TABLE IF EXISTS phone_verification_codes CASCADE;

-- إنشاء جدول جديد بسيط
CREATE TABLE IF NOT EXISTS phone_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false
);

-- إضافة index للبحث السريع برقم الجوال
CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_phone ON phone_auth_codes(phone);
CREATE INDEX IF NOT EXISTS idx_phone_auth_codes_expires ON phone_auth_codes(expires_at);

-- تفعيل RLS
ALTER TABLE phone_auth_codes ENABLE ROW LEVEL SECURITY;

-- لا توجد policies - الجدول للنظام فقط (Service Role Key)