import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MoMoRequest {
  orderId: string;
  phone: string;
  amount: number;
  network: "mtn" | "airtel";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, phone, amount, network } = (await req.json()) as MoMoRequest;

    if (!orderId || !phone || !amount || !network) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitise phone — must be Ugandan number
    const cleanPhone = phone.replace(/\D/g, "");
    if (!/^256\d{9}$/.test(cleanPhone) && !/^0\d{9}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ugandan phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formattedPhone = cleanPhone.startsWith("0")
      ? `256${cleanPhone.slice(1)}`
      : cleanPhone;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Store payment intent
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_method: "mobile_money",
        payment_status: "pending",
        customer_phone: formattedPhone,
      })
      .eq("id", orderId);

    if (updateError) {
      throw new Error(`Failed to update order: ${updateError.message}`);
    }

    // --- MoMo API integration placeholder ---
    // In production, replace this section with actual MTN MoMo API or
    // Airtel Money API calls. You'll need:
    //   - MTN: API User, API Key, Subscription Key from momodeveloper.mtn.com
    //   - Airtel: Client ID / Secret from developers.airtel.africa
    //
    // The callback URL should point to the momo-callback Edge Function:
    //   `${supabaseUrl}/functions/v1/momo-callback`

    let externalRef: string;

    if (network === "mtn") {
      // MTN MoMo Collections API
      // POST https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay
      // Headers: Authorization, X-Reference-Id, X-Target-Environment, Ocp-Apim-Subscription-Key
      externalRef = crypto.randomUUID();

      const mtnApiUser = Deno.env.get("MTN_MOMO_API_USER");
      const mtnApiKey = Deno.env.get("MTN_MOMO_API_KEY");
      const mtnSubKey = Deno.env.get("MTN_MOMO_SUBSCRIPTION_KEY");
      const mtnEnv = Deno.env.get("MTN_MOMO_ENVIRONMENT") || "sandbox";

      if (mtnApiUser && mtnApiKey && mtnSubKey) {
        // Get access token
        const tokenRes = await fetch(
          `https://${mtnEnv === "sandbox" ? "sandbox" : "proxy"}.momodeveloper.mtn.com/collection/token/`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${mtnApiUser}:${mtnApiKey}`)}`,
              "Ocp-Apim-Subscription-Key": mtnSubKey,
            },
          }
        );
        const { access_token } = await tokenRes.json();

        const baseUrl =
          mtnEnv === "sandbox"
            ? "https://sandbox.momodeveloper.mtn.com"
            : "https://proxy.momodeveloper.mtn.com";

        await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "X-Reference-Id": externalRef,
            "X-Target-Environment": mtnEnv,
            "Ocp-Apim-Subscription-Key": mtnSubKey,
            "X-Callback-Url": `${supabaseUrl}/functions/v1/momo-callback`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: String(amount),
            currency: "UGX",
            externalId: orderId,
            payer: { partyIdType: "MSISDN", partyId: formattedPhone },
            payerMessage: "9Yards Food Order",
            payeeNote: `Order ${orderId}`,
          }),
        });
      }
    } else {
      // Airtel Money Collections API
      externalRef = crypto.randomUUID();

      const airtelClientId = Deno.env.get("AIRTEL_CLIENT_ID");
      const airtelClientSecret = Deno.env.get("AIRTEL_CLIENT_SECRET");
      const airtelEnv = Deno.env.get("AIRTEL_ENVIRONMENT") || "sandbox";

      if (airtelClientId && airtelClientSecret) {
        const baseUrl =
          airtelEnv === "sandbox"
            ? "https://openapiuat.airtel.africa"
            : "https://openapi.airtel.africa";

        // Get token
        const tokenRes = await fetch(`${baseUrl}/auth/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: airtelClientId,
            client_secret: airtelClientSecret,
            grant_type: "client_credentials",
          }),
        });
        const { access_token } = await tokenRes.json();

        await fetch(`${baseUrl}/merchant/v1/payments/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${access_token}`,
            "X-Country": "UG",
            "X-Currency": "UGX",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reference: orderId,
            subscriber: { country: "UG", currency: "UGX", msisdn: formattedPhone },
            transaction: {
              amount,
              country: "UG",
              currency: "UGX",
              id: externalRef,
            },
          }),
        });
      }
    }

    // Store the external reference for callback matching
    await supabase
      .from("orders")
      .update({ payment_reference: externalRef })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        reference: externalRef,
        message: "Payment request sent. Please approve on your phone.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
