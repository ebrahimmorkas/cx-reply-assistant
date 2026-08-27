/**
 * Builds the prompt sent to Groq. This is where the guardrail actually
 * lives — not as a separate filter bolted on afterward, but as an
 * explicit constraint baked into the instructions themselves:
 *
 *   1. The model is told to answer ONLY from the provided policy
 *      excerpts — not general knowledge about "typical" return policies.
 *   2. The model must self-report whether the policy text actually
 *      covers the situation, as a structured `sufficient_context`
 *      boolean — this is what lets index.ts downgrade confidence
 *      instead of shipping a confident-sounding guess.
 *   3. When context is insufficient, the model is told exactly what
 *      *kind* of reply to write (acknowledge + escalate, no promises)
 *      rather than left to improvise a refusal.
 */

import type { SearchResult } from "./qdrant.ts";
import type { ChatMessage } from "./groq.ts";

interface PromptInput {
  brandName: string;
  customerName: string;
  order: {
    order_number: string;
    item_description: string;
    status: string;
    delivered_at: string | null;
  } | null;
  conversationHistory: Array<{ sender_type: string; content: string }>;
  customerMessage: string;
  retrievedChunks: SearchResult[];
}

export function buildPrompt(input: PromptInput): ChatMessage[] {
  const policyContext = input.retrievedChunks.length
    ? input.retrievedChunks
        .map(
          (chunk, i) =>
            `[${i + 1}] (${chunk.payload.category}) ${chunk.payload.title}\n"${chunk.payload.text}"`
        )
        .join("\n\n")
    : "No relevant policy excerpts were found.";

  const orderInfo = input.order
    ? `Order ${input.order.order_number}: ${input.order.item_description}. Status: ${input.order.status}. Delivered: ${input.order.delivered_at ?? "not yet delivered"}.`
    : "No order on file for this customer.";

  const historyText = input.conversationHistory
    .map((m) => `${m.sender_type === "customer" ? "Customer" : "Agent"}: ${m.content}`)
    .join("\n");

  const system: ChatMessage = {
    role: "system",
    content: `You are a customer support reply assistant for ${input.brandName}, a consumer brand. You draft replies for a human agent to review before sending — you never send anything directly to the customer.

STRICT RULES:
- Base your answer ONLY on the policy excerpts provided below, plus the order details given. Do not use general knowledge about what return/refund policies "usually" say.
- If the policy excerpts and order details together clearly answer the customer's question, write a helpful, concise, empathetic reply (2-4 sentences) that states the resolution.
- If the policy excerpts do NOT clearly cover this exact situation, or the situation is ambiguous or borderline, do NOT guess or promise an outcome (like a refund or replacement). Instead, write a short reply that acknowledges the customer's issue, avoids committing to a specific resolution, and tells them a team member will review their case.
- Never invent policy details, dates, dollar/rupee amounts, or order information not given to you.
- Keep the tone warm and professional, matching a real support agent — not robotic.

Respond with ONLY a JSON object in this exact shape, no markdown fences, no extra text:
{"reply": "<the drafted reply text>", "sufficient_context": <true or false>, "reasoning": "<one short sentence on why the policy did or didn't clearly cover this>"}`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Policy excerpts retrieved for this brand:
${policyContext}

Customer: ${input.customerName}
${orderInfo}

Recent conversation:
${historyText}

Draft a reply to the customer's most recent message: "${input.customerMessage}"`,
  };

  return [system, user];
}

export interface ParsedModelOutput {
  reply: string;
  sufficient_context: boolean;
  reasoning: string;
}

/** Parses the model's JSON output defensively — LLMs occasionally wrap
 * JSON in markdown fences despite instructions not to. */
export function parseModelOutput(raw: string): ParsedModelOutput {
  let text = raw.trim();
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1].trim();

  const parsed = JSON.parse(text);
  if (typeof parsed.reply !== "string" || typeof parsed.sufficient_context !== "boolean") {
    throw new Error(`Model output missing required fields: ${text.slice(0, 200)}`);
  }
  return {
    reply: parsed.reply,
    sufficient_context: parsed.sufficient_context,
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
  };
}