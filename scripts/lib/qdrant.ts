/**
 * Minimal Qdrant REST client — deliberately not using the official SDK.
 * Qdrant's REST API is simple enough that plain fetch keeps this code
 * portable between the Node ingestion script and the Deno Edge Function
 * (1D) without dealing with two different package ecosystems.
 */

export interface QdrantConfig {
  url: string; // e.g. https://xxxx.aws.cloud.qdrant.io:6333
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

function headers(cfg: QdrantConfig) {
  return {
    "Content-Type": "application/json",
    "api-key": cfg.apiKey,
  };
}

/** Creates the collection if it doesn't already exist. Safe to call repeatedly. */
export async function ensureCollection(cfg: QdrantConfig, vectorSize: number) {
  const checkRes = await fetch(`${cfg.url}/collections/${cfg.collection}`, {
    headers: headers(cfg),
  });

  if (!checkRes.ok) {
    const createRes = await fetch(`${cfg.url}/collections/${cfg.collection}`, {
      method: "PUT",
      headers: headers(cfg),
      body: JSON.stringify({
        vectors: { size: vectorSize, distance: "Cosine" },
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create Qdrant collection: ${await createRes.text()}`);
    }
  }

  // Qdrant requires an explicit payload index on any field used in a
  // filter (our brand_id filter in searchChunks). Safe to call even if
  // the index already exists — Qdrant treats it as a no-op.
  await ensurePayloadIndex(cfg, "brand_id", "keyword");
}

async function ensurePayloadIndex(cfg: QdrantConfig, fieldName: string, schema: string) {
  const res = await fetch(`${cfg.url}/collections/${cfg.collection}/index`, {
    method: "PUT",
    headers: headers(cfg),
    body: JSON.stringify({
      field_name: fieldName,
      field_schema: schema,
    }),
  });

  // 200 = created, 4xx with "already exists"-type message = fine to ignore.
  if (!res.ok) {
    const body = await res.text();
    if (!body.includes("already exists")) {
      throw new Error(`Failed to create payload index on "${fieldName}": ${body}`);
    }
  }
}

/** Upserts a batch of embedded chunks into the collection. */
export async function upsertChunks(
  cfg: QdrantConfig,
  points: Array<{ id: string; vector: number[]; payload: KnowledgeChunkPayload }>
) {
  const res = await fetch(`${cfg.url}/collections/${cfg.collection}/points?wait=true`, {
    method: "PUT",
    headers: headers(cfg),
    body: JSON.stringify({ points }),
  });

  if (!res.ok) {
    throw new Error(`Failed to upsert points into Qdrant: ${await res.text()}`);
  }
}

export interface SearchResult {
  score: number;
  payload: KnowledgeChunkPayload;
}

/**
 * Searches for the most relevant chunks given a query vector, optionally
 * filtered to a single brand (critical — an agent at Brand A must never
 * retrieve Brand B's policy text).
 */
export async function searchChunks(
  cfg: QdrantConfig,
  queryVector: number[],
  brandId: string,
  limit = 4
): Promise<SearchResult[]> {
  const res = await fetch(`${cfg.url}/collections/${cfg.collection}/points/search`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify({
      vector: queryVector,
      limit,
      filter: {
        must: [{ key: "brand_id", match: { value: brandId } }],
      },
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