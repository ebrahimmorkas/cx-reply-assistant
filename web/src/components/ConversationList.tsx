import type { ConversationSummary } from "../types";
import { timeAgo, initials } from "../lib/format";

interface Props {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  chat: "Chat",
};

export function ConversationList({ conversations, activeId, onSelect, loading }: Props) {
  return (
    <div className="flex h-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h1 className="text-sm font-semibold text-[var(--color-ink)]">Conversations</h1>
        <span className="rounded-full bg-[var(--color-canvas)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-muted)]">
          {conversations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-sm text-[var(--color-ink-faint)]">Loading conversations…</div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="p-4 text-sm text-[var(--color-ink-faint)]">
            No conversations yet. New customer messages will appear here.
          </div>
        )}

        {conversations.map(({ conversation, customer, latestMessage }) => {
          const isActive = conversation.id === activeId;
          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left transition-colors ${
                isActive ? "bg-[var(--color-ai-soft)]" : "hover:bg-[var(--color-canvas)]"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-border)] text-xs font-semibold text-[var(--color-ink-muted)]">
                {initials(customer.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                    {customer.name}
                  </span>
                  {latestMessage && (
                    <span className="shrink-0 text-xs text-[var(--color-ink-faint)]">
                      {timeAgo(latestMessage.created_at)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--color-ink-muted)]">
                  {latestMessage?.content ?? "No messages yet"}
                </p>
                <span className="mt-1 inline-block rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
                  {CHANNEL_LABEL[conversation.channel] ?? conversation.channel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}