import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedText } from "../_shared/embeddings.ts";
import { searchChunks } from "../_shared/qdrant.ts";
import { buildPrompt, parseModelOutput } from "../_shared/prompt.ts";
import { chatCompletion } from "../_shared/groq.ts";
import { computeConfidence } from "../_shared/confidence.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();
    if (!conversationId) {
      return jsonResponse({ error: "conversationId is required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const HF_API_KEY = Deno.env.get("HF_API_KEY")!;
    const QDRANT_URL = Deno.env.get("QDRANT_URL")!;
    const QDRANT_API_KEY = Deno.env.get("QDRANT_API_KEY")!;
    const QDRANT_COLLECTION = Deno.env.get("QDRANT_COLLECTION") || "knowledge_chunks";
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
    const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load context
    const { data: conversation, error: convErr } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();
    if (convErr || !conversation) return jsonResponse({ error: "Conversation not found" }, 404);

    const [{ data: brand }, { data: customer }, { data: orders }, { data: messages }] =
      await Promise.all([
        supabase.from("brands").select("*").eq("id", conversation.brand_id).single(),
        supabase.from("customers").select("*").eq("id", conversation.customer_id).single(),
        supabase
          .from("orders")
          .select("*")
          .eq("customer_id", conversation.customer_id)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true }),
      ]);

    if (!brand || !customer) return jsonResponse({ error: "Brand or customer not found" }, 404);

    const customerMessages = (messages ?? []).filter((m: any) => m.sender_type === "customer");
    const latestCustomerMessage = customerMessages[customerMessages.length - 1];
    if (!latestCustomerMessage) {
      return jsonResponse({ error: "No customer message found to reply to" }, 400);
    }

    // 2. Embed the customer's message
    const queryVector = await embedText(latestCustomerMessage.content, HF_API_KEY);

    // 3. Retrieve relevant policy chunks, scoped to this brand
    const retrievedChunks = await searchChunks(
      { url: QDRANT_URL, apiKey: QDRANT_API_KEY, collection: QDRANT_COLLECTION },
      queryVector,
      conversation.brand_id,
      4
    );

    // 4. Build prompt + call Groq
    const promptMessages = buildPrompt({
      brandName: brand.name,
      customerName: customer.name,
      order: orders?.[0] ?? null,
      conversationHistory: (messages ?? []).slice(-6).map((m: any) => ({
        sender_type: m.sender_type,
        content: m.content,
      })),
      customerMessage: latestCustomerMessage.content,
      retrievedChunks,
    });

    const rawOutput = await chatCompletion(promptMessages, GROQ_API_KEY, GROQ_MODEL);
    const parsed = parseModelOutput(rawOutput);

    // 5. Compute final confidence (retrieval score + model self-report)
    const topScore = retrievedChunks[0]?.score ?? 0;
    const confidence = computeConfidence(topScore, parsed.sufficient_context);

    // 6. Audit log
    const retrievedContextForLog = retrievedChunks.map((c) => ({
      doc_id: c.payload.doc_id,
      title: c.payload.title,
      snippet: c.payload.text,
      score: c.score,
    }));

    const { data: logRow, error: logErr } = await supabase
      .from("reply_logs")
      .insert({
        conversation_id: conversationId,
        brand_id: conversation.brand_id,
        customer_message: latestCustomerMessage.content,
        retrieved_context: retrievedContextForLog,
        ai_response: parsed.reply,
        status: "generated",
        confidence,
      })
      .select()
      .single();

    if (logErr) {
      console.error("Failed to write reply_logs:", logErr);
      // Non-fatal — still return the draft even if logging failed, but surface it
    }

    // 7. Respond
    return jsonResponse({
      replyLogId: logRow?.id ?? null,
      reply: parsed.reply,
      confidence,
      reasoning: parsed.reasoning,
      retrievedContext: retrievedContextForLog,
    });
  } catch (err) {
    console.error("generate-reply failed:", err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}