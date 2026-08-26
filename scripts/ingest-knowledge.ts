/**
 * One-time (re-runnable) ingestion script.
 *
 * What it does:
 *   1. Reads every row from `knowledge_docs` in Supabase
 *   2. Splits each doc's content into small chunks (chunk.ts)
 *   3. Embeds each chunk via HuggingFace (embeddings.ts)
 *   4. Upserts all chunks into Qdrant, tagged with brand_id + doc_id
 *      (qdrant.ts) so retrieval can filter by brand and we can always
 *      trace a retrieved chunk back to its source policy document.
 *
 * Run with:  npm run ingest
 *
 * Safe to re-run: point IDs are deterministic (doc_id + chunk_index),
 * so re-running after editing a policy doc just overwrites the old
 * vectors instead of creating duplicates.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { chunkText } from "./lib/chunk";
import { embedText, EMBEDDING_DIM } from "./lib/embeddings";
import { ensureCollection, upsertChunks, type KnowledgeChunkPayload } from "./lib/qdrant";

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const HF_API_KEY = requireEnv("HF_API_KEY");
const QDRANT_URL = requireEnv("QDRANT_URL");
const QDRANT_API_KEY = requireEnv("QDRANT_API_KEY");
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "knowledge_chunks";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}. Check your .env file.`);
    process.exit(1);
  }
  return val;
}

// Deterministic point ID so re-ingesting the same doc/chunk overwrites
// rather than duplicates. Qdrant point IDs must be uint64 or UUID —
// we derive a stable UUID-shaped string from doc_id + chunk_index.
function pointId(docId: string, chunkIndex: number): string {
  const base = docId.replace(/-/g, "");
  return [
    base.slice(0, 8),
    base.slice(8, 12),
    base.slice(12, 16),
    base.slice(16, 20),
    (base.slice(20, 32) + chunkIndex.toString().padStart(4, "0")).slice(0, 12),
  ].join("-");
}

async function main() {
  console.log("Connecting to Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: docs, error } = await supabase.from("knowledge_docs").select("*");
  if (error) throw error;
  if (!docs || docs.length === 0) {
    console.error("No knowledge_docs found. Did you run 0002_seed.sql?");
    process.exit(1);
  }
  console.log(`Found ${docs.length} knowledge docs.`);

  const qdrantCfg = { url: QDRANT_URL, apiKey: QDRANT_API_KEY, collection: QDRANT_COLLECTION };
  console.log(`Ensuring Qdrant collection "${QDRANT_COLLECTION}" exists...`);
  await ensureCollection(qdrantCfg, EMBEDDING_DIM);

  let totalChunks = 0;

  for (const doc of docs) {
    const chunks = chunkText(doc.content);
    console.log(`\n"${doc.title}" -> ${chunks.length} chunk(s)`);

    const points = [];
    for (const chunk of chunks) {
      process.stdout.write(`  embedding chunk ${chunk.chunkIndex}... `);
      const vector = await embedText(chunk.text, HF_API_KEY);
      console.log("done");

      const payload: KnowledgeChunkPayload = {
        doc_id: doc.id,
        brand_id: doc.brand_id,
        category: doc.category,
        title: doc.title,
        text: chunk.text,
        chunk_index: chunk.chunkIndex,
      };

      points.push({
        id: pointId(doc.id, chunk.chunkIndex),
        vector,
        payload,
      });
    }

    await upsertChunks(qdrantCfg, points);
    totalChunks += points.length;
  }

  console.log(`\nDone. Upserted ${totalChunks} chunks across ${docs.length} documents into Qdrant.`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});