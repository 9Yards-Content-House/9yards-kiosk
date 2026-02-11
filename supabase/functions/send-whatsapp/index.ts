import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppPayload {
  orderNumber: string;
  customerName: string;
  total: number;
  itemsSummary: string;
  paymentMethod: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderNumber, customerName, total, itemsSummary, paymentMethod } =
      (await req.json()) as WhatsAppPayload;

    const whatsappToken = Deno.env.get("WHATSAPP_BUSINESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const kitchenPhone = Deno.env.get("KITCHEN_WHATSAPP_NUMBER") || "256708899597";

    if (!whatsappToken || !whatsappPhoneId) {
      // WhatsApp not configured — skip silently
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "WhatsApp not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send via WhatsApp Business Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: kitchenPhone,
          type: "text",
          text: {
            body: [
              `🆕 *New Order: ${orderNumber}*`,
              `👤 ${customerName}`,
              `💰 ${total.toLocaleString()} UGX (${paymentMethod})`,
              ``,
              `📋 *Items:*`,
              itemsSummary,
              ``,
              `Open dashboard: https://kitchen.9yards.co.ug/orders`,
            ].join("\n"),
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} ${errBody}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // Don't fail the order just because WhatsApp notification failed
    console.error("WhatsApp send error:", (err as Error).message);
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
