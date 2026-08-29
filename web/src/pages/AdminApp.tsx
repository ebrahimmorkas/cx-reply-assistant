import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { ConversationList } from "../components/ConversationList";
import { ConversationThread } from "../components/ConversationThread";
import { CustomerInfoPanel } from "../components/CustomerInfoPanel";
import { useConversationList, useConversationDetail } from "../lib/queries";
import { sendMessage, approveGeneratedReply } from "../lib/mutations";
import { useGenerateReply } from "../lib/useGenerateReply";
import { useAuth } from "../lib/auth";
import { useAgentProfile } from "../lib/profiles";
import { useRealtimeRefresh } from "../lib/useRealtimeRefresh";

export function AdminApp() {
  const navigate = useNavigate();
  const { session, loading: authLoading, signOut } = useAuth();
  const { agent, loading: agentLoading } = useAgentProfile(session);

  const { conversations, loading: listLoading, error: listError, refresh: refreshList } = useConversationList();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { detail, loading: detailLoading, refresh: refreshDetail } = useConversationDetail(activeId);
  const { draft, loading: generating, error: generateError, generate, clear } = useGenerateReply();

  useRealtimeRefresh(() => {
    refreshList();
    refreshDetail();
  });

  useEffect(() => {
    if (!authLoading && !session) navigate("/admin/login");
  }, [authLoading, session, navigate]);

  const handleSend = async (content: string) => {
    if (!activeId) return;
    await sendMessage(activeId, content, "agent");
    refreshDetail();
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    clear();
  };

  const handleGenerateReply = () => {
    if (!activeId) return;
    generate(activeId);
  };

  const handleApproveDraft = async (finalText: string) => {
    if (!activeId || !draft) return;
    await approveGeneratedReply(activeId, draft.replyLogId, draft.reply, finalText);
    clear();
    refreshDetail();
  };

  if (authLoading || agentLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-[var(--color-ink-faint)]">
        Loading…
      </div>
    );
  }

  if (!session) return null; // redirect effect is in flight

  if (!agent) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[var(--color-ink)]">
          This account isn't set up as an agent.
        </p>
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--color-canvas)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
        <span className="text-sm font-medium text-[var(--color-ink)]">Signed in as {agent.name}</span>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={handleSelectConversation}
            loading={listLoading}
            error={listError}
          />
        </div>

        <ConversationThread
          detail={detail}
          loading={detailLoading}
          onSend={handleSend}
          onGenerateReply={handleGenerateReply}
          generating={generating}
          generateError={generateError}
          draft={draft}
          onRegenerateDraft={handleGenerateReply}
          onApproveDraft={handleApproveDraft}
          onDiscardDraft={clear}
        />

        <CustomerInfoPanel detail={detail} />
      </div>
    </div>
  );
}