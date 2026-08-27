import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import type { ConfidenceLevel } from "../types";

const CONFIG: Record<
  ConfidenceLevel,
  { label: string; icon: typeof ShieldCheck; classes: string }
> = {
  high: {
    label: "High confidence",
    icon: ShieldCheck,
    classes:
      "bg-[var(--color-confidence-high-soft)] text-[var(--color-confidence-high)] border-[var(--color-confidence-high-border)]",
  },
  low: {
    label: "Low confidence — review before sending",
    icon: ShieldAlert,
    classes:
      "bg-[var(--color-confidence-low-soft)] text-[var(--color-confidence-low)] border-[var(--color-confidence-low-border)]",
  },
  insufficient_context: {
    label: "Not covered by policy — needs human judgment",
    icon: ShieldQuestion,
    classes:
      "bg-[var(--color-confidence-insufficient-soft)] text-[var(--color-confidence-insufficient)] border-[var(--color-confidence-insufficient-border)]",
  },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const { label, icon: Icon, classes } = CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${classes}`}
    >
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </span>
  );
}