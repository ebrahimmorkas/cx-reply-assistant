import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { embedText } from "./lib/embeddings";
import { searchChunks } from "./lib/qdrant";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const HF_API_KEY = process.env.HF_API_KEY!;
const QDRANT_URL = process.env.QDRANT_URL!;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "knowledge_chunks";

async function main() {
  const query = process.argv.slice(2).join(" ");
  if (!query) {
    console.error('Usage: npm run test-retrieval "your customer message here"');
    process.exit(1);
  }

  // Look up the seeded brand id dynamically rather than hardcoding it.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: brand, error } = await supabase.from("brands").select("id, name").limit(1).single();
  if (error || !brand) {
    console.error("Could not find a brand — did you run the seed migration?", error);
    process.exit(1);
  }

  console.log(`Query: "${query}"`);
  console.log(`Brand: ${brand.name} (${brand.id})\n`);

  const queryVector = await embedText(query, HF_API_KEY);

  const results = await searchChunks(
    { url: QDRANT_URL, apiKey: QDRANT_API_KEY, collection: QDRANT_COLLECTION },
    queryVector,
    brand.id,
    4
  );

  if (results.length === 0) {
    console.log("No results. Did you run `npm run ingest` yet?");
    return;
  }

  results.forEach((r, i) => {
    console.log(`#${i + 1}  score=${r.score.toFixed(4)}  [${r.payload.category}] ${r.payload.title}`);
    console.log(`     "${r.payload.text}"\n`);
  });
}

main().catch((err) => {
  console.error("Retrieval test failed:", err);
  process.exit(1);
});