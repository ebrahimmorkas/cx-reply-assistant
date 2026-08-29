import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { useRealtimeMessages } from "./useRealtimeMessages";
import { appendMessageUnique } from "./messageUtils";
import type { ConversationSummary, ConversationDetail, Message } from "../types";

export function useConversationList() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    const { data: convos, error: convoErr } = await supabase
      .from("conversations")
      .select("*")
      .order("created_at", { ascending: false });

    if (convoErr) {
      setError(convoErr.message);
      if (!silent) setLoading(false);
      return;
    }

    const { data: reads } = await supabase
      .from("conversation_reads")
      .select("conversation_id, last_read_at");
    const lastReadByConversation = new Map((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));

    const summaries: ConversationSummary[] = await Promise.all(
      (convos ?? []).map(async (conversation) => {
        const lastReadAt = lastReadByConversation.get(conversation.id) ?? "1970-01-01T00:00:00Z";

        const [{ data: customer }, { data: messages }, { count: unreadCount }] = await Promise.all([
          supabase.from("customers").select("*").eq("id", conversation.customer_id).single(),
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conversation.id)
            .eq("sender_type", "customer")
            .gt("created_at", lastReadAt),
        ]);

        return {
          conversation,
          customer: customer!,
          latestMessage: messages?.[0] ?? null,
          unreadCount: unreadCount ?? 0,
        };
      })
    );

    setConversations(summaries);
    if (!silent) setLoading(false);
  }, []);

  const markLocalRead = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.conversation.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, loading, error, refresh, markLocalRead };
}

export function useConversationDetail(conversationId: string | null) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: conversation, error: convoErr } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convoErr || !conversation) {
      setError(convoErr?.message ?? "Conversation not found");
      setLoading(false);
      return;
    }

    const [{ data: customer }, { data: orders }, { data: messages }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", conversation.customer_id).single(),
      supabase
        .from("orders")
        .select("*")
        .eq("customer_id", conversation.customer_id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }),
    ]);

    setDetail({
      conversation,
      customer: customer!,
      order: orders?.[0] ?? null,
      messages: messages ?? [],
    });
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const appendMessage = useCallback(
    (message: Message) => {
      setDetail((prev) => {
        if (!prev || prev.conversation.id !== message.conversation_id) return prev;
        return { ...prev, messages: appendMessageUnique(prev.messages, message) };
      });
    },
    []
  );

  useRealtimeMessages(conversationId, appendMessage);

  return { detail, loading, error, refresh, appendMessage };
}