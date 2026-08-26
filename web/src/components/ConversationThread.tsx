import { useEffect, useRef } from "react";
import type { ConversationDetail } from "../types";
import { MessageBubble } from "./MessageBubble";
import { ReplyComposer } from "./ReplyComposer";

interface Props {
  detail: ConversationDetail | null;
  loading: boolean;
  onSend: (content: string) => void;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[var(--color-confidence-low-soft)] text-[var(--color-confidence-low)] border-[var(--color-confidence-low-border)]",
  pending: "bg-[var(--color-canvas)] text-[var(--color-ink-muted)] border-[var(--color-border)]",
  resolved: "bg-[var(--color-confidence-high-soft)] text-[var(--color-confidence-high)] border-[var(--color-confidence-high-border)]",
};

export function ConversationThread({ detail, loading, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-faint)]">
        Loading conversation…
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink-faint)]">
        Select a conversation to get started.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--color-canvas)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-ink)]">{detail.customer.name}</h2>
          <p className="text-xs text-[var(--color-ink-muted)]">
            {detail.customer.email ?? detail.customer.phone ?? "No contact info"}
          </p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[detail.conversation.status] ?? ""}`}
        >
          {detail.conversation.status}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {detail.messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>

      <ReplyComposer onSend={onSend} />
    </div>
  );
}