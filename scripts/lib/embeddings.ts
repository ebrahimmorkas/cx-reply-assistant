const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

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