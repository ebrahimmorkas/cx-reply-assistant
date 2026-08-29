import { supabase } from "./supabase";
import type { SenderType } from "../types";

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: SenderType = "agent"
) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: senderType,
    content,
  });
  if (error) throw new Error(error.message);
}

export async function approveGeneratedReply(
  conversationId: string,
  replyLogId: string | null,
  originalDraft: string,
  finalText: string
) {
  const wasEdited = finalText.trim() !== originalDraft.trim();

  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_type: "ai",
    content: finalText,
  });
  if (msgError) throw new Error(msgError.message);

  if (replyLogId) {
    const { error: logError } = await supabase
      .from("reply_logs")
      .update({
        agent_edited_response: wasEdited ? finalText : null,
        final_response: finalText,
        status: wasEdited ? "edited" : "approved",
      })
      .eq("id", replyLogId);
    if (logError) throw new Error(logError.message);
  }
}