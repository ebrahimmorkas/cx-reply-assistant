import { Package, Mail, Phone, Calendar } from "lucide-react";
import type { ConversationDetail } from "../types";
import { formatDate } from "../lib/format";

const ORDER_STATUS_STYLE: Record<string, string> = {
  delivered: "bg-[var(--color-confidence-high-soft)] text-[var(--color-confidence-high)] border-[var(--color-confidence-high-border)]",
  shipped: "bg-[var(--color-ai-soft)] text-[var(--color-ai)] border-[var(--color-ai-border)]",
  placed: "bg-[var(--color-canvas)] text-[var(--color-ink-muted)] border-[var(--color-border)]",
  cancelled: "bg-[var(--color-confidence-insufficient-soft)] text-[var(--color-confidence-insufficient)] border-[var(--color-confidence-insufficient-border)]",
};

function Field({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-[var(--color-ink-faint)]" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-[var(--color-ink-faint)]">{label}</div>
        <div className="truncate text-sm text-[var(--color-ink)]">{value}</div>
      </div>
    </div>
  );
}

export function CustomerInfoPanel({ detail }: { detail: ConversationDetail | null }) {
  if (!detail) {
    return (
      <div className="hidden h-full w-72 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] lg:block" />
    );
  }

  const { customer, order } = detail;

  return (
    <div className="hidden h-full w-72 shrink-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Customer
        </h3>
      </div>
      <div className="space-y-3 px-4 py-4">
        {customer.email && <Field icon={Mail} label="Email" value={customer.email} />}
        {customer.phone && <Field icon={Phone} label="Phone" value={customer.phone} />}
        <Field icon={Calendar} label="Customer since" value={formatDate(customer.created_at)} />
      </div>

      <div className="border-y border-[var(--color-border)] px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
          Latest Order
        </h3>
      </div>
      {order ? (
        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-[var(--color-ink)]">{order.order_number}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${ORDER_STATUS_STYLE[order.status] ?? ""}`}
            >
              {order.status}
            </span>
          </div>
          <Field icon={Package} label="Item" value={order.item_description} />
          {order.delivered_at && (
            <Field icon={Calendar} label="Delivered" value={formatDate(order.delivered_at)} />
          )}
        </div>
      ) : (
        <div className="px-4 py-4 text-sm text-[var(--color-ink-faint)]">No orders on file.</div>
      )}
    </div>
  );
}