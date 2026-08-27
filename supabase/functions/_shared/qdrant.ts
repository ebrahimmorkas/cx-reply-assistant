/**
 * Deno port of scripts/lib/qdrant.ts, search-only — the Edge Function
 * never writes to Qdrant, only queries it at reply-generation time.
 */

export interface QdrantConfig {
  url: string;
  apiKey: string;
  collection: string;
}

export interface KnowledgeChunkPayload {
  doc_id: string;
  brand_id: string;
  category: string;
  title: string;
  text: string;
  chunk_index: number;
}

export interface SearchResult {
  score: number;
  payload: KnowledgeChunkPayload;
}

export async function searchChunks(
  cfg: QdrantConfig,
  queryVector: number[],
  brandId: string,
  limit = 4
): Promise<SearchResult[]> {
  const res = await fetch(`${cfg.url}/collections/${cfg.collection}/points/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": cfg.apiKey,
    },
    body: JSON.stringify({
      vector: queryVector,
      limit,
      filter: { must: [{ key: "brand_id", match: { value: brandId } }] },
      with_payload: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Qdrant search failed: ${await res.text()}`);
  }

  const data = await res.json();
  return (data.result ?? []).map((r: any) => ({
    score: r.score,
    payload: r.payload as KnowledgeChunkPayload,
  }));
}