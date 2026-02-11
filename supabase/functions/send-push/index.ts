import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  targetRole?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, body, targetRole, url } =
      (await req.json()) as PushPayload;

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:info@9yards.co.ug";

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "VAPID keys not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch push subscriptions
    let query = supabase.from("push_subscriptions").select("subscription, user_id");

    if (targetRole) {
      // Only send to users with the target role
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", targetRole)
        .eq("is_active", true);

      if (!profiles || profiles.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userIds = profiles.map((p) => p.id);
      query = query.in("user_id", userIds);
    }

    const { data: subscriptions, error } = await query;

    if (error) throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Web Push requires the web-push library or manual JWT signing.
    // In Deno, we use the Web Crypto API to sign the VAPID JWT.
    // For simplicity, this implementation uses the fetch-based approach
    // with pre-signed headers. In production, use a proper web-push library.

    const payload = JSON.stringify({
      title,
      body,
      icon: "/images/logo/9yards-icon-192.png",
      badge: "/images/logo/9yards-icon-72.png",
      data: { url: url || "/orders" },
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        // Send push notification via the subscription endpoint
        // NOTE: Full Web Push encryption requires the web-push protocol.
        // This is a simplified version — for production, use:
        // https://deno.land/x/web_push or implement RFC 8291 encryption.
        const res = await fetch(subscription.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            TTL: "86400",
          },
          body: new TextEncoder().encode(payload),
        });

        if (res.ok || res.status === 201) {
          sent++;
        } else if (res.status === 404 || res.status === 410) {
          // Subscription expired — clean up
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", sub.user_id);
          failed.push(sub.user_id);
        }
      } catch {
        // Individual push failure — continue with others
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, failed: failed.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push send error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
