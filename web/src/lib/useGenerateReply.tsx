import { useState } from "react";
import { supabase } from "./supabase";
import type { ConfidenceLevel, RetrievedChunk } from "../types";

export interface GeneratedDraft {
  replyLogId: string | null;
  reply: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  retrievedContext: RetrievedChunk[];
}

export function useGenerateReply() {
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (conversationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-reply", {
        body: { conversationId },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setDraft(data as GeneratedDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setDraft(null);
    setError(null);
  };

  return { draft, loading, error, generate, clear };
}