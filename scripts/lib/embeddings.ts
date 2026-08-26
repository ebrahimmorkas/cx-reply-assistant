/**
 * Embedding client for HuggingFace's Inference API.
 *
 * Model: sentence-transformers/all-MiniLM-L6-v2
 *   - 384-dimensional vectors (small, fast, cheap to store/search)
 *   - Good general-purpose semantic similarity for short text like
 *     policy sentences and customer messages — no need for a huge
 *     model at this scale.
 *
 * This same function is called at:
 *   - INGESTION time (embedding each policy chunk once)
 *   - QUERY time (embedding the customer's message before search)
 * Using the identical model for both is required — embeddings from
 * different models are not comparable to each other.
 */

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
// HuggingFace retired api-inference.huggingface.co in favor of the new
// "Inference Providers" router. hf-inference is HF's own first-party
// provider (as opposed to third-party providers like Together/Fireworks
// routed through the same gateway) and still serves feature-extraction
// for sentence-transformers models.
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}/pipeline/feature-extraction`;

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: text,
      options: { wait_for_model: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HuggingFace embedding request failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  // The feature-extraction pipeline for sentence-transformers models
  // returns a flat array of numbers (already mean-pooled) for a single
  // string input. If a model instead returns per-token vectors
  // (array of arrays), mean-pool them ourselves as a fallback.
  if (Array.isArray(data) && typeof data[0] === "number") {
    return data as number[];
  }

  if (Array.isArray(data) && Array.isArray(data[0])) {
    const tokenVectors = data as number[][];
    const dim = tokenVectors[0].length;
    const pooled = new Array(dim).fill(0);
    for (const vec of tokenVectors) {
      for (let i = 0; i < dim; i++) pooled[i] += vec[i];
    }
    return pooled.map((v) => v / tokenVectors.length);
  }

  throw new Error(`Unexpected embedding response shape: ${JSON.stringify(data).slice(0, 200)}`);
}

export const EMBEDDING_DIM = 384;