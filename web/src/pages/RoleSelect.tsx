import { useNavigate } from "react-router-dom";
import { Headset, User } from "lucide-react";

export function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-canvas)] px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">CX Reply Assistant</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Choose how you'd like to continue</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => navigate("/admin/login")}
          className="flex w-64 flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center hover:border-[var(--color-ai-border)] hover:bg-[var(--color-ai-soft)]"
        >
          <Headset size={28} className="text-[var(--color-ai)]" />
          <span className="font-medium text-[var(--color-ink)]">I'm a Support Agent</span>
          <span className="text-xs text-[var(--color-ink-muted)]">Access the admin panel</span>
        </button>
        <button
          onClick={() => navigate("/client/login")}
          className="flex w-64 flex-col items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center hover:border-[var(--color-ai-border)] hover:bg-[var(--color-ai-soft)]"
        >
          <User size={28} className="text-[var(--color-ai)]" />
          <span className="font-medium text-[var(--color-ink)]">I'm a Customer</span>
          <span className="text-xs text-[var(--color-ink-muted)]">Ask a question</span>
        </button>
      </div>
    </div>
  );
}