import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, USE_MOCK_DATA } from "../lib/supabase";

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string;
}

// Mock customer data for development
const mockCustomer: Customer = {
  id: "mock-customer-1",
  phone: "256771234567",
  name: "Test Customer",
  loyalty_points: 150,
  total_orders: 12,
  total_spent: 450000,
  last_order_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

/**
 * Hook to fetch customer loyalty data by phone number
 */
export function useLoyaltyPoints(phone: string | null) {
  return useQuery({
    queryKey: ["loyalty", phone],
    queryFn: async () => {
      if (!phone) return null;

      if (USE_MOCK_DATA) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));
        return phone === mockCustomer.phone ? mockCustomer : null;
      }

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", phone)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No customer found
          return null;
        }
        throw error;
      }

      return data as Customer;
    },
    enabled: !!phone && phone.length >= 10,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to redeem loyalty points
 */
export function useRedeemPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      phone,
      points,
    }: {
      phone: string;
      points: number;
    }): Promise<{ discount: number; remainingPoints: number }> => {
      if (USE_MOCK_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const discount = points * 100; // 1 point = 100 UGX
        return {
          discount,
          remainingPoints: Math.max(0, mockCustomer.loyalty_points - points),
        };
      }

      const { data, error } = await supabase.rpc("redeem_loyalty_points", {
        phone_number: phone,
        points_to_redeem: points,
      });

      if (error) throw error;

      if (!data[0]?.success) {
        throw new Error("Insufficient points");
      }

      return {
        discount: data[0].discount_amount,
        remainingPoints: data[0].remaining_points,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loyalty", variables.phone] });
    },
  });
}

/**
 * Calculate points earned from an order
 * 1 point per 1000 UGX spent
 */
export function calculatePointsEarned(orderTotal: number): number {
  return Math.floor(orderTotal / 1000);
}

/**
 * Calculate discount from points
 * 1 point = 100 UGX
 */
export function calculateDiscountFromPoints(points: number): number {
  return points * 100;
}

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  return points.toLocaleString();
}

/**
 * Get loyalty tier based on points
 */
export function getLoyaltyTier(points: number): {
  name: string;
  color: string;
  minPoints: number;
  discount: number;
} {
  if (points >= 1000) {
    return { name: "Gold", color: "#FFD700", minPoints: 1000, discount: 10 };
  }
  if (points >= 500) {
    return { name: "Silver", color: "#C0C0C0", minPoints: 500, discount: 5 };
  }
  if (points >= 100) {
    return { name: "Bronze", color: "#CD7F32", minPoints: 100, discount: 2 };
  }
  return { name: "Member", color: "#9CA3AF", minPoints: 0, discount: 0 };
}
