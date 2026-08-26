import { useState } from "react";
import { ConversationList } from "./components/ConversationList";
import { ConversationThread } from "./components/ConversationThread";
import { CustomerInfoPanel } from "./components/CustomerInfoPanel";
import { useConversationList, useConversationDetail } from "./lib/queries";
import { sendMessage } from "./lib/mutations";

function App() {
  const { conversations, loading: listLoading } = useConversationList();
  const [activeId, setActiveId] = useState<string | null>(null);
  const { detail, loading: detailLoading, refresh } = useConversationDetail(activeId);

  const handleSend = async (content: string) => {
    if (!activeId) return;
    await sendMessage(activeId, content, "agent");
    refresh();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-canvas)]">
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          loading={listLoading}
        />
      </div>

      <ConversationThread detail={detail} loading={detailLoading} onSend={handleSend} />

      <CustomerInfoPanel detail={detail} />
    </div>
  );
}

export default App;