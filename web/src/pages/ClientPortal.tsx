import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Send } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useCustomerProfile } from "../lib/profiles";
import { useRealtimeMessages } from "../lib/useRealtimeMessages";
import { appendMessageUnique } from "../lib/messageUtils";
import { MessageBubble } from "../components/MessageBubble";
import type { Conversation, Message } from "../types";

export function ClientPortal() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signOut } = useAuth();
  const { customer, loading: customerLoading } = useCustomerProfile(session);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConvo, setLoadingConvo] = useState(true);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customer) return;

    (async () => {
      setLoadingConvo(true);
      const { data: convo } = await supabase
        .from("conversations")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setConversation(convo ?? null);

      if (convo) {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: true });
        setMessages(msgs ?? []);
      }
      setLoadingConvo(false);
    })();
  }, [customer]);

  const handleRealtimeInsert = useCallback((message: Message) => {
    setMessages((prev) => appendMessageUnique(prev, message));
  }, []);
  useRealtimeMessages(conversation?.id ?? null, handleRealtimeInsert);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!authLoading && !session) navigate("/client/login");
  }, [authLoading, session, navigate]);

  const handleSend = async () => {
    if (!text.trim() || !customer) return;
    const content = text.trim();
    setText("");

    let conversationId = conversation?.id;

    if (!conversationId) {
      const { data: newConvo, error } = await supabase
        .from("conversations")
        .insert({ customer_id: customer.id, brand_id: customer.brand_id, channel: "chat", status: "open" })
        .select()
        .single();
      if (error || !newConvo) {
        alert(`Couldn't start a new conversation: ${error?.message}`);
        return;
      }
      conversationId = newConvo.id;
      setConversation(newConvo);
    }

    const { data: newMessage, error: msgError } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_type: "customer", content })
      .select()
      .single();
    if (msgError || !newMessage) {
      alert(`Couldn't send your message: ${msgError?.message}`);
      return;
    }
    setMessages((prev) => appendMessageUnique(prev, newMessage));
  };

  if (authLoading || customerLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--color-ink-faint)]">
        Loading…
      </div>
    );
  }

  if (!session) return null;

  if (!customer) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[var(--color-ink)]">This account isn't linked to a customer profile.</p>
        <button
          onClick={() => signOut()}
          className="rounded-lg bg-[var(--color-ink)] px-4 py-2 text-sm font-medium text-white"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-[var(--color-canvas)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-[var(--color-ink)]">Hi, {customer.name}</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">Ask us anything about your order</p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loadingConvo && <p className="text-sm text-[var(--color-ink-faint)]">Loading…</p>}
        {!loadingConvo && messages.length === 0 && (
          <p className="text-sm text-[var(--color-ink-faint)]">
            No messages yet — send one below to start a conversation with our support team.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-2 text-sm focus:border-[var(--color-ai)] focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}