import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderReceiptRequest {
  orderId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const whatsappApiUrl = Deno.env.get("WHATSAPP_API_URL");
    const whatsappAccessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const whatsappPhoneId = Deno.env.get("WHATSAPP_PHONE_ID");

    if (!whatsappApiUrl || !whatsappAccessToken || !whatsappPhoneId) {
      console.log("WhatsApp not configured, skipping receipt send");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { orderId }: OrderReceiptRequest = await req.json();

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Skip if no phone number
    if (!order.customer_phone) {
      return new Response(
        JSON.stringify({ success: false, message: "No phone number" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number for WhatsApp (Uganda format)
    let phone = order.customer_phone.replace(/\D/g, "");
    if (phone.startsWith("0")) {
      phone = "256" + phone.slice(1);
    } else if (!phone.startsWith("256")) {
      phone = "256" + phone;
    }

    // Build receipt message
    const itemsList = order.items
      .map((item: { quantity: number; sauce_name: string; type: string; total_price: number }) => 
        `• ${item.quantity}x ${item.sauce_name || item.type === "combo" ? item.sauce_name + " Combo" : "Item"} - UGX ${item.total_price.toLocaleString()}`
      )
      .join("\n");

    const receiptMessage = `🧾 *9Yards Food - Order Receipt*

*Order #${order.order_number}*
Customer: ${order.customer_name || "Guest"}
${order.customer_location ? `Location: ${order.customer_location}` : ""}

📋 *Items:*
${itemsList}

💰 *Total: UGX ${order.total.toLocaleString()}*
💳 Payment: ${order.payment_method.replace("_", " ").toUpperCase()}
📊 Status: ${order.payment_status.toUpperCase()}

🕐 Ordered: ${new Date(order.created_at).toLocaleString("en-UG", { 
  hour: "2-digit", 
  minute: "2-digit",
  day: "numeric",
  month: "short"
})}

Track your order: 9yards.ug/lookup/${order.order_number}

Thank you for ordering with 9Yards! 🙏`;

    // Send via WhatsApp Business API
    const whatsappResponse = await fetch(`${whatsappApiUrl}/${whatsappPhoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          body: receiptMessage,
        },
      }),
    });

    if (!whatsappResponse.ok) {
      const errorText = await whatsappResponse.text();
      console.error("WhatsApp API error:", errorText);
      throw new Error("Failed to send WhatsApp message");
    }

    const result = await whatsappResponse.json();

    // Log the successful send
    console.log(`Receipt sent to ${phone} for order ${order.order_number}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messages?.[0]?.id,
        phone 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("send-receipt error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
