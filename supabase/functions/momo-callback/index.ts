import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

serve(async (req) => {
  try {
    const body = await req.json();

    // Determine which provider sent the callback
    // MTN sends: { externalId, status, ... }
    // Airtel sends: { transaction: { id, status_code, ... } }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let orderId: string | undefined;
    let paymentSucceeded = false;

    if (body.externalId) {
      // MTN MoMo callback
      orderId = body.externalId;
      paymentSucceeded = body.status === "SUCCESSFUL";
    } else if (body.transaction) {
      // Airtel Money callback
      orderId = body.transaction?.id;
      // Airtel uses status_code "TS" for success
      paymentSucceeded = body.transaction?.status_code === "TS";
    } else {
      return new Response(JSON.stringify({ error: "Unknown callback format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing order reference" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newPaymentStatus = paymentSucceeded ? "paid" : "failed";

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newPaymentStatus })
      .eq("id", orderId);

    if (error) {
      throw new Error(`Failed to update payment status: ${error.message}`);
    }

    // If payment failed, optionally notify
    if (!paymentSucceeded) {
      await supabase.from("notifications").insert({
        order_id: orderId,
        type: "payment_failed",
        message: `MoMo payment failed for order`,
        target_role: "admin",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
