export interface Brand {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Customer {
  id: string;
  brand_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  auth_user_id: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  brand_id: string;
  customer_id: string;
  order_number: string;
  item_description: string;
  status: "placed" | "shipped" | "delivered" | "cancelled";
  delivered_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  brand_id: string;
  customer_id: string;
  channel: "whatsapp" | "email" | "chat";
  status: "open" | "pending" | "resolved";
  created_at: string;
}

export type SenderType = "customer" | "agent" | "ai";

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  content: string;
  created_at: string;
}

export type ReplyStatus = "generated" | "edited" | "approved";
export type ConfidenceLevel = "high" | "low" | "insufficient_context";

export interface RetrievedChunk {
  doc_id: string;
  title: string;
  snippet: string;
  score: number;
}

export interface ReplyLog {
  id: string;
  conversation_id: string;
  brand_id: string;
  customer_message: string;
  retrieved_context: RetrievedChunk[];
  ai_response: string | null;
  agent_edited_response: string | null;
  final_response: string | null;
  status: ReplyStatus;
  confidence: ConfidenceLevel | null;
  created_at: string;
}

export interface ConversationSummary {
  conversation: Conversation;
  customer: Customer;
  latestMessage: Message | null;
}

export interface ConversationDetail {
  conversation: Conversation;
  customer: Customer;
  order: Order | null;
  messages: Message[];
}