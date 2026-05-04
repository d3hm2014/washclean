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

function randomPassword(length = 28): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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
    const code = (body?.code as string | undefined)?.trim();

    if (!phoneRaw || !code) {
      return new Response(JSON.stringify({ error: "Phone and code required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = normalizeSaudiPhone(phoneRaw);
    if (!/^\+966\d{9}$/.test(phone)) {
      return new Response(JSON.stringify({ error: "Invalid Saudi phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip = getClientIp(req);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ✅ Rate limit لمحاولات التحقق (على نفس الرقم) — 8 محاولات خلال 10 دقائق
    // بما إن جدولك ما فيه attempts/ip، نستخدم count على created_at كـ "سقف" تقريبي
    // (الأفضل لاحقاً جدول منفصل verify_attempts، لكن هذا حل سريع بدون تغيير DB)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from("phone_auth_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", tenMinAgo);

    // ملاحظة: هذا يحسب "طلبات إرسال" أكثر من "محاولات تحقق" فعلياً،
    // لكنه يمنع الهجوم السريع لو المهاجم يطلب + يتحقق بشكل متكرر.
    if ((recentCount ?? 0) >= 6) {
      return new Response(JSON.stringify({ error: "Too many attempts. Try later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ بدل ما نبحث بـ eq(code) مباشرة،
    // نجيب آخر كود (غير مستخدم) للرقم ونقارنه
    const { data: codeRow } = await supabase
      .from("phone_auth_codes")
      .select("*")
      .eq("phone", phone)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!codeRow) {
      return new Response(JSON.stringify({ error: "No active code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(codeRow.expires_at) < new Date()) {
      // تنظيف
      await supabase.from("phone_auth_codes").delete().eq("id", codeRow.id);
      return new Response(JSON.stringify({ error: "Code expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(codeRow.code) !== code) {
      // لا نعطي تفاصيل كثيرة (عشان ما نسهّل التخمين)
      console.error("Invalid code attempt", { phone, ip });
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark used
    await supabase.from("phone_auth_codes").update({ used: true }).eq("id", codeRow.id);

    // Email ثابت مرتبط بالرقم (كمُعرّف)، وكلمة مرور مؤقتة عشوائية
    const tempEmail = `${phone.replace(/\+/g, "")}@phone.auth`;
    const newPassword = randomPassword(28);

    // هل فيه profile؟
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();

    let userId: string | null = profile?.id ?? null;
    let isNewUser = false;

    if (!userId) {
      const created = await supabase.auth.admin.createUser({
        email: tempEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { phone },
      });

      if (created.error || !created.data?.user) {
        console.error("createUser error:", created.error);
        return new Response(JSON.stringify({ error: "Failed to create user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = created.data.user.id;
      isNewUser = true;

      const ins = await supabase.from("profiles").insert({
        id: userId,
        phone,
        role: "customer",
      });

      if (ins.error) {
        console.error("profile insert error:", ins.error);
      }
    } else {
      const upd = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
      if (upd.error) {
        console.error("updateUser password error:", upd.error);
        return new Response(JSON.stringify({ error: "Failed to update login credentials" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_new_user: isNewUser,
        phone,
        email: tempEmail,
        password: newPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-phone-code error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});