import { useEffect } from "react";
import { supabase } from "./supabase";

/**
 * Subscribes to live inserts on messages and conversations, calling
 * onChange whenever either happens. Deliberately a full refresh
 * trigger rather than surgical state patching — at this scale (a
 * handful of conversations) a full refetch is simpler and just as
 * fast; the Part 2 architecture doc notes that surgical cache updates
 * would matter at real production scale, but here it would be added
 * complexity with no visible benefit.
 *
 * Security note: this subscribes with no manual filtering, which is
 * safe specifically because Supabase Realtime enforces the same Row
 * Level Security policies as regular queries — an agent only receives
 * events for their brand's conversations, and a customer only receives
 * events for their own, exactly like a normal select would return.
 */
export function useRealtimeRefresh(onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel("live-conversations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onChange)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, onChange)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}