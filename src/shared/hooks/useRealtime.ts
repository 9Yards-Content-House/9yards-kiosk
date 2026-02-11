import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@shared/lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = "orders" | "order_items" | "notifications" | "menu_items";
type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeOptions<T = Record<string, unknown>> {
  table: TableName;
  event?: EventType;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: T) => void;
  /** Query keys to invalidate on changes */
  invalidateKeys?: string[][];
}

/**
 * Subscribe to Supabase Realtime Postgres Changes.
 * Automatically invalidates TanStack Query caches on changes.
 */
export function useRealtime<T = Record<string, unknown>>(
  options: UseRealtimeOptions<T>
) {
  const queryClient = useQueryClient();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const { table, event = "*", filter } = optionsRef.current;

    const channelConfig: {
      event: string;
      schema: string;
      table: string;
      filter?: string;
    } = {
      event,
      schema: "public",
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(`realtime-${table}-${event}-${filter || "all"}`)
      .on(
        "postgres_changes" as never,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const opts = optionsRef.current;
          const record = (payload.new || payload.old) as T;

          if (payload.eventType === "INSERT" && opts.onInsert) {
            opts.onInsert(record);
          }
          if (payload.eventType === "UPDATE" && opts.onUpdate) {
            opts.onUpdate(record);
          }
          if (payload.eventType === "DELETE" && opts.onDelete) {
            opts.onDelete(record);
          }

          // Invalidate related query caches
          if (opts.invalidateKeys) {
            opts.invalidateKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Convenience: subscribe to order changes (dashboard) */
export function useOrderRealtime(callbacks?: {
  onNewOrder?: (order: Record<string, unknown>) => void;
  onOrderUpdate?: (order: Record<string, unknown>) => void;
}) {
  useRealtime({
    table: "orders",
    event: "*",
    invalidateKeys: [["orders"], ["orders", "today"]],
    onInsert: callbacks?.onNewOrder,
    onUpdate: callbacks?.onOrderUpdate,
  });
}
