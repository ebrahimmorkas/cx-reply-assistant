import { useState, useEffect } from "react";
import { RefreshCw, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { GeneratedDraft } from "../lib/useGenerateReply";

interface Props {
  draft: GeneratedDraft;
  generating: boolean;
  onRegenerate: () => void;
  onApprove: (finalText: string) => void;
  onDiscard: () => void;
}

export function GeneratedReplyPanel({ draft, generating, onRegenerate, onApprove, onDiscard }: Props) {
  const [text, setText] = useState(draft.reply);
  const [showContext, setShowContext] = useState(false);

  // Reset the editable text whenever a fresh draft comes in (e.g. after regenerate)
  useEffect(() => setText(draft.reply), [draft.reply]);

  const wasEdited = text.trim() !== draft.reply.trim();

  return (
    <div className="mx-4 mb-3 rounded-xl border border-[var(--color-ai-border)] bg-[var(--color-ai-soft)] p-3">
      <div className="mb-2 flex items-center justify-between">
        <ConfidenceBadge level={draft.confidence} />
        <button
          onClick={() => setShowContext((s) => !s)}
          className="flex items-center gap-1 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          Sources ({draft.retrievedContext.length})
          {showContext ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {draft.confidence === "insufficient_context" && (
        <p className="mb-2 text-xs text-[var(--color-confidence-insufficient)]">
          The policy text doesn't clearly cover this situation — review carefully before sending.
        </p>
      )}

      {showContext && (
        <div className="mb-2 space-y-1.5 rounded-lg bg-[var(--color-surface)] p-2.5">
          {draft.retrievedContext.length === 0 && (
            <p className="text-xs text-[var(--color-ink-faint)]">No policy chunks were retrieved.</p>
          )}
          {draft.retrievedContext.map((chunk, i) => (
            <div key={i} className="text-xs">
              <span className="font-mono text-[var(--color-ink-faint)]">
                score {chunk.score.toFixed(2)}
              </span>{" "}
              <span className="font-medium text-[var(--color-ink)]">{chunk.title}</span>
              <p className="text-[var(--color-ink-muted)]">"{chunk.snippet}"</p>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-lg border border-[var(--color-ai-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none"
      />
      {wasEdited && (
        <p className="mt-1 text-[11px] text-[var(--color-ink-faint)]">Edited from the original draft</p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <button
          onClick={onDiscard}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
        >
          <X size={13} />
          Discard
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-canvas)] disabled:opacity-50"
          >
            <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
            Regenerate
          </button>
          <button
            onClick={() => onApprove(text)}
            disabled={generating || !text.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            <Check size={13} />
            Approve &amp; Send
          </button>
        </div>
      </div>
    </div>
  );
}