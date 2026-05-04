import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function buildCorsHeaders(origin: string | null) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowOrigin =
    !origin
      ? (allowed[0] || "*")
      : allowed.length === 0
        ? "*"
        : allowed.includes(origin)
          ? origin
          : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Vary": "Origin",
  };
}

function generateCode6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeSaudiPhone(phone: string): string {
  const trimmed = String(phone || "").trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+966")) return trimmed;

  const digits = trimmed.replace(/[^\d]/g, "");
  const without0 = digits.replace(/^0+/, "");

  if (without0.length === 9) return `+966${without0}`;
  if (without0.startsWith("966") && without0.length === 12) return `+${without0}`;

  return `+966${without0}`;
}

function toAuthenticaLocal(phoneE164: string): string {
  // Authentica حسب مشروعك يرسل بدون +966 (يعني 5xxxxxxxx)
  return phoneE164.replace(/^\+966/, "").replace(/^966/, "");
}

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phoneRaw = body?.phone as string | undefined;

    if (!phoneRaw) {
      return new Response(JSON.stringify({ error: "Phone number required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizeSaudiPhone(phoneRaw);

    // لازم +966 وبعدها 9 أرقام (سعودي)
    if (!/^\+966\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid Saudi phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Rate limit: 3 خلال 10 دقائق لنفس الرقم
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("phone_auth_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many requests. Try later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cooldown: 30 ثانية
    const { data: lastRow } = await supabase
      .from("phone_auth_codes")
      .select("created_at")
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRow?.created_at) {
      const lastTs = new Date(lastRow.created_at).getTime();
      if (Date.now() - lastTs < 30_000) {
        return new Response(JSON.stringify({ error: "Please wait before requesting another code." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // توليد كود + صلاحية 10 دقائق
    const code = generateCode6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // تنظيف الأكواد القديمة لنفس الرقم
    await supabase.from("phone_auth_codes").delete().eq("phone", phone);

    const { error: insertErr } = await supabase.from("phone_auth_codes").insert({
      phone,
      code,
      expires_at: expiresAt,
      used: false,
    });

    if (insertErr) {
      console.error("DB insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create code" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authenticaApiKey = Deno.env.get("AUTHENTICA_API_KEY");
    if (!authenticaApiKey) {
      console.error("AUTHENTICA_API_KEY missing");
      return new Response(JSON.stringify({ error: "SMS service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = toAuthenticaLocal(phone);

    const authenticaResp = await fetch("https://api.authentica.sa/api/sdk/v1/sendOTP", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: authenticaApiKey,
        phone: cleanPhone,
        method: "sms",
        digits: 6,
        format: "numeric",
        otp: code,
      }),
    });

    // ✅ مهم: خله نص عشان لو Authentica رجّع HTML/نص ما يطيح
    const authenticaText = await authenticaResp.text();
    let authenticaJson: any = null;
    try {
      authenticaJson = JSON.parse(authenticaText);
    } catch {}

    // لو فشل
    if (!authenticaResp.ok) {
      console.error("Authentica error:", authenticaJson ?? authenticaText, { phone, cleanPhone, ip });

      return new Response(
        JSON.stringify({
          error: "Failed to send OTP",
          authentica_status: authenticaResp.status,
          authentica_body: authenticaJson ?? authenticaText,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ Debug مؤقت — عشان نعرف ليش ما يوصل
    // بعد ما تضبط المشكلة احذف debug_code/debug_authentica
    return new Response(
      JSON.stringify({
        success: true,
        message: "Code sent",
        debug_code: code,
        debug_authentica: {
          cleanPhone,
          status: authenticaResp.status,
          body: authenticaJson ?? authenticaText,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-verification-code error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});