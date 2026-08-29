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

    const summaries: ConversationSummary[] = await Promise.all(
      (convos ?? []).map(async (conversation) => {
        const [{ data: customer }, { data: messages }] = await Promise.all([
          supabase.from("customers").select("*").eq("id", conversation.customer_id).single(),
          supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);

        return {
          conversation,
          customer: customer!,
          latestMessage: messages?.[0] ?? null,
        };
      })
    );

    setConversations(summaries);
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { conversations, loading, error, refresh };
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

  // Live append: a new message for the currently-open conversation
  // shows up immediately, with no refetch and no loading flash.
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