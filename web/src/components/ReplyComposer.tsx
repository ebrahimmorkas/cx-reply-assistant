import { useState } from "react";
import { Sparkles, Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
  onGenerateReply?: () => void;
  generating?: boolean;
}

export function ReplyComposer({ onSend, onGenerateReply, generating }: Props) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type a reply, or generate one with AI…"
        rows={3}
        className="w-full resize-none rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-ai)] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onGenerateReply}
          disabled={!onGenerateReply || generating}
          title={!onGenerateReply ? "Generate Reply flow is wired up in step 1D" : undefined}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-ai-border)] bg-[var(--color-ai-soft)] px-3 py-1.5 text-sm font-medium text-[var(--color-ai)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles size={14} strokeWidth={2.5} />
          {generating ? "Generating…" : "Generate Reply"}
        </button>
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}