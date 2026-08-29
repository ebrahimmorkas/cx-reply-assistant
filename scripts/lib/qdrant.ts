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

function headers(cfg: QdrantConfig) {
  return {
    "Content-Type": "application/json",
    "api-key": cfg.apiKey,
  };
}

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