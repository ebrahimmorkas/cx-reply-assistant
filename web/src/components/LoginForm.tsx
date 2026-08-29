import { useState } from "react";
import { useAuth } from "../lib/auth";

interface Props {
  title: string;
  subtitle: string;
  onSuccess: () => void;
  demoEmail?: string;
}

export function LoginForm({ title, subtitle, onSuccess, demoEmail }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(demoEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      setError(signInError);
      return;
    }
    onSuccess();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{subtitle}</p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-2 text-sm focus:border-[var(--color-ai)] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-ink-muted)]">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-3 py-2 text-sm focus:border-[var(--color-ai)] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-[var(--color-confidence-insufficient)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-lg bg-[var(--color-ink)] py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in\u2026" : "Sign in"}
        </button>
      </form>
    </div>
  );
}