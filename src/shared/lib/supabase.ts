import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if we're in mock mode (no Supabase credentials)
export const USE_MOCK_DATA = !supabaseUrl || !supabaseAnonKey;

if (USE_MOCK_DATA) {
  console.warn(
    "⚠️ Running in MOCK MODE - no Supabase credentials found.\n" +
    "To use real data, create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
  );
}

// Create a real client or a dummy placeholder
export const supabase: SupabaseClient = USE_MOCK_DATA
  ? (null as unknown as SupabaseClient) // Will be guarded by USE_MOCK_DATA checks
  : createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
