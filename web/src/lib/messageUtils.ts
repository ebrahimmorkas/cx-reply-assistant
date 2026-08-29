import type { Message } from "../types";

export function appendMessageUnique(messages: Message[], incoming: Message): Message[] {
  if (messages.some((m) => m.id === incoming.id)) return messages;
  return [...messages, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at));
}