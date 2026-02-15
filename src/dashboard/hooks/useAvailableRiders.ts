import { useQuery } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "@shared/lib/supabase";
import type { Profile } from "@shared/types/auth";

// Mock riders for development
const MOCK_RIDERS: Profile[] = [
  {
    id: "rider-1",
    full_name: "John Mukasa",
    role: "rider",
    phone: "+256700111222",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "rider-2",
    full_name: "Grace Nambi",
    role: "rider",
    phone: "+256700333444",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "rider-3",
    full_name: "Peter Ochieng",
    role: "rider",
    phone: "+256700555666",
    active: false, // inactive rider
    created_at: new Date().toISOString(),
  },
];

/**
 * Hook to fetch all available (active) riders
 */
export function useAvailableRiders() {
  return useQuery<Profile[]>({
    queryKey: ["riders", "available"],
    queryFn: async () => {
      if (USE_MOCK_DATA) {
        // Filter to only active riders
        return MOCK_RIDERS.filter(r => r.active);
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "rider")
        .eq("active", true)
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 30_000, // Cache for 30 seconds
  });
}

/**
 * Hook to get a specific rider by ID
 */
export function useRider(riderId: string | null) {
  return useQuery<Profile | null>({
    queryKey: ["rider", riderId],
    queryFn: async () => {
      if (!riderId) return null;

      if (USE_MOCK_DATA) {
        return MOCK_RIDERS.find(r => r.id === riderId) || null;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", riderId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }
      return data as Profile;
    },
    enabled: !!riderId,
  });
}
