import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  orderId: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
  status: "preparing" | "ready" | "delivered";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, orderNumber, customerPhone, customerName, status } =
      (await req.json()) as NotifyRequest;

    if (!orderId || !orderNumber || !customerPhone || !status) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    const cleanPhone = customerPhone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.startsWith("0")
      ? `256${cleanPhone.slice(1)}`
      : cleanPhone.startsWith("256")
      ? cleanPhone
      : `256${cleanPhone}`;

    // Compose message based on status
    let message = "";
    const greeting = customerName ? `Hi ${customerName}! ` : "Hi! ";

    switch (status) {
      case "preparing":
        message = `${greeting}Your order ${orderNumber} is now being prepared. We'll notify you when it's ready! 🍳`;
        break;
      case "ready":
        message = `${greeting}Great news! Your order ${orderNumber} is READY for pickup! 🎉 Please come to the counter to collect it.`;
        break;
      case "delivered":
        message = `${greeting}Your order ${orderNumber} has been delivered. Thank you for ordering from 9Yards Food! Enjoy your meal! 😋`;
        break;
    }

    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    // Send WhatsApp notification if configured
    if (whatsappToken && whatsappPhoneId) {
      const whatsappResponse = await fetch(
        `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: formattedPhone,
            type: "text",
            text: { body: message },
          }),
        }
      );

      if (!whatsappResponse.ok) {
        const errorData = await whatsappResponse.text();
        console.error("WhatsApp API error:", errorData);
        // Don't fail the request, just log the error
      }
    } else {
      console.log("WhatsApp not configured. Message would be:", message);
    }

    // Store notification in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("notifications").insert({
      order_id: orderId,
      type: "whatsapp",
      recipient: formattedPhone,
      message,
      status: "sent",
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
