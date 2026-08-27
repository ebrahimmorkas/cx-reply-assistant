import { useState } from "react";
import { ConversationList } from "./components/ConversationList";
import { ConversationThread } from "./components/ConversationThread";
import { CustomerInfoPanel } from "./components/CustomerInfoPanel";
import { useConversationList, useConversationDetail } from "./lib/queries";
import { sendMessage, approveGeneratedReply } from "./lib/mutations";
import { useGenerateReply } from "./lib/useGenerateReply";

function App() {
  const { conversations, loading: listLoading, error: listError } = useConversationList();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { detail, loading: detailLoading, refresh } = useConversationDetail(activeId);
  const { draft, loading: generating, error: generateError, generate, clear } = useGenerateReply();

  const handleSend = async (content: string) => {
    if (!activeId) return;
    await sendMessage(activeId, content, "agent");
    refresh();
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    clear(); // discard any in-progress draft from the previous conversation
  };

  const handleGenerateReply = () => {
    if (!activeId) return;
    generate(activeId);
  };

  const handleApproveDraft = async (finalText: string) => {
    if (!activeId || !draft) return;
    await approveGeneratedReply(activeId, draft.replyLogId, draft.reply, finalText);
    clear();
    refresh();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas)]">
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
  );
}

export default App;