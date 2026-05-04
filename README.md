# 💧 ووش كلين — دليل التشغيل الكامل

## هيكل المشروع
```
washclean/
├── src/                    ← كود React
│   ├── pages/             ← 17 صفحة
│   ├── components/        ← 7 مكونات
│   ├── stores/            ← authStore + bookingStore
│   └── lib/               ← supabase + sms + translations
├── supabase/
│   ├── functions/         ← 4 Edge Functions
│   │   ├── send-verification-code/
│   │   ├── verify-phone-code/
│   │   ├── create-customer/
│   │   └── send-sms/
│   └── SETUP_DATABASE.sql ← إعداد قاعدة البيانات كاملة
├── .env                   ← متغيرات البيئة
└── package.json
```

---

## الخطوة ١ — تشغيل قاعدة البيانات

1. افتح **Supabase Dashboard** → **SQL Editor**
2. افتح الملف `supabase/SETUP_DATABASE.sql`
3. انسخ المحتوى كاملاً والصقه في SQL Editor
4. اضغط **Run**

---

## الخطوة ٢ — نشر الـ Edge Functions

افتح Terminal في VS Code وشغّل:

```bash
# تثبيت Supabase CLI
npm install -g supabase

# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref rahvprcgzuknpsihhjlx

# نشر الـ Functions
supabase functions deploy send-verification-code
supabase functions deploy verify-phone-code
supabase functions deploy create-customer
supabase functions deploy send-sms
```

---

## الخطوة ٣ — إضافة مفتاح SMS

في Supabase Dashboard → **Settings** → **Edge Functions** → **Secrets**:

أضف:
```
AUTHENTICA_API_KEY = مفتاحك_هنا
```

---

## الخطوة ٤ — تشغيل التطبيق

```bash
npm install
npm run dev
```

افتح: **http://localhost:5173**

---

## الخطوة ٥ — إنشاء حساب Admin

بعد تسجيل دخولك للمرة الأولى، شغّل هذا في SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE phone = '+9665XXXXXXXX';  -- ← ضع رقمك هنا
```

---

## الحسابات والأدوار

| الدور | الصلاحيات |
|---|---|
| `customer` | الحجز والتتبع |
| `mobile_team` | استقبال طلبات الغسيل المتنقل |
| `wash_center_staff` | إدارة حجوزات المغسلة |
| `admin` | كل الصلاحيات |

---

## الروابط المهمة

- تطبيق العميل: `/`
- لوحة السائق: `/washer`
- لوحة الموظف: `/staff`
- لوحة الإدارة: `/admin`
