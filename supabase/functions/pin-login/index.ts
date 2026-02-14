import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Hash a PIN using SHA-256 with application-specific salt
 * Must match the implementation in set-pin function
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = Deno.env.get("PIN_SALT") || "9yards-pin-salt-2024";
  const data = encoder.encode(pin + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate PIN format (4-6 digits)
 */
function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pin } = await req.json();

    if (!pin || !isValidPin(pin)) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN format. PIN must be 4-6 digits." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Hash the PIN
    const pinHash = await hashPin(pin);

    // Look up user by PIN hash
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role, active")
      .eq("pin_hash", pinHash)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.active) {
      return new Response(
        JSON.stringify({ error: "Account is disabled" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);

    if (authError || !authUser.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a session for the user
    // Note: This creates a short-lived session token
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email!,
      options: {
        redirectTo: "/",
      },
    });

    if (sessionError) {
      console.error("Session generation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last login time
    await supabase
      .from("profiles")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", profile.id);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          full_name: profile.full_name,
          role: profile.role,
        },
        // Return the verification token for the client to exchange
        token: sessionData.properties?.hashed_token,
        redirectUrl: sessionData.properties?.redirect_to,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PIN login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
