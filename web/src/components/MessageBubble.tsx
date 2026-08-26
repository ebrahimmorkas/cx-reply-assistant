import { Sparkles } from "lucide-react";
import type { Message } from "../types";
import { timeAgo } from "../lib/format";

export function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender_type === "customer";
  const isAi = message.sender_type === "ai";

  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div className={`max-w-[70%] ${isCustomer ? "" : "text-right"}`}>
        {isAi && (
          <div className="mb-1 flex items-center justify-end gap-1 text-[11px] font-medium text-[var(--color-ai)]">
            <Sparkles size={12} strokeWidth={2.5} />
            AI-assisted reply
          </div>
        )}
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed ${
            isCustomer
              ? "rounded-tl-sm bg-[var(--color-canvas)] text-[var(--color-ink)]"
              : isAi
                ? "rounded-tr-sm border border-[var(--color-ai-border)] bg-[var(--color-ai-soft)] text-[var(--color-ink)]"
                : "rounded-tr-sm bg-[var(--color-ink)] text-white"
          }`}
        >
          {message.content}
        </div>
        <div className="mt-1 text-[11px] text-[var(--color-ink-faint)]">
          {timeAgo(message.created_at)}
        </div>
      </div>
    </div>
  );
}