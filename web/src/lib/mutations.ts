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