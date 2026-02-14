import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Hash a PIN using SHA-256 with application-specific salt
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

interface SetPinRequest {
  newPin: string;
  currentPin?: string; // Required if user already has a PIN
  currentPassword?: string; // Alternative: verify with password
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the user's auth token from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - no auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create client with user's token to get their user ID
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body: SetPinRequest = await req.json();
    const { newPin, currentPin, currentPassword } = body;

    // Validate new PIN format
    if (!newPin || !isValidPin(newPin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be 4-6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current profile to check if PIN exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("pin_hash")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user already has a PIN, they must verify with current PIN or password
    if (profile.pin_hash) {
      let verified = false;

      // Option 1: Verify with current PIN
      if (currentPin) {
        const currentPinHash = await hashPin(currentPin);
        verified = currentPinHash === profile.pin_hash;
      }
      // Option 2: Verify with password
      else if (currentPassword) {
        const { error: authError } = await supabaseUser.auth.signInWithPassword({
          email: userData.user.email!,
          password: currentPassword,
        });
        verified = !authError;
      }

      if (!verified) {
        return new Response(
          JSON.stringify({ error: "Verification failed. Provide current PIN or password." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Hash the new PIN
    const newPinHash = await hashPin(newPin);

    // Update the profile with the new PIN hash
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ pin_hash: newPinHash })
      .eq("id", userId);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`PIN ${profile.pin_hash ? "updated" : "set"} for user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: profile.pin_hash ? "PIN updated successfully" : "PIN set successfully",
        isFirstPin: !profile.pin_hash
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("set-pin error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
