import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import type { Message } from "../types";

export function useRealtimeMessages(
  conversationId: string | null,
  onInsert: (message: Message) => void
) {
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onInsertRef.current(payload.new as Message)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
}