/**
 * Splits a policy document into small, semantically coherent chunks.
 *
 * Why chunk at all, given these docs are short (a few sentences each)?
 * Two reasons, worth calling out in the write-up:
 *   1. It's the right pattern to demonstrate even at small scale, since
 *      Part 2 (system design) asks us to reason about scaling this to
 *      500 brands — at that scale, docs will be much longer, and
 *      un-chunked retrieval would return whole irrelevant documents.
 *   2. Smaller chunks -> more precise retrieval -> the LLM gets exactly
 *      the sentence that answers "what's the refund window", not a
 *      whole policy dumped into its context.
 *
 * Strategy: split on sentence boundaries, then group sentences into
 * chunks of ~2 sentences with a 1-sentence overlap, so a policy nuance
 * that spans a sentence boundary (e.g. "damaged items are exempt from
 * the 7-day rule") doesn't get split across two disconnected chunks.
 */

export interface Chunk {
  text: string;
  chunkIndex: number;
}

export function chunkText(text: string, sentencesPerChunk = 2, overlap = 1): Chunk[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const chunks: Chunk[] = [];
  const step = Math.max(1, sentencesPerChunk - overlap);

  for (let i = 0; i < sentences.length; i += step) {
    const slice = sentences.slice(i, i + sentencesPerChunk);
    if (slice.length === 0) break;
    chunks.push({
      text: slice.join(" "),
      chunkIndex: chunks.length,
    });
    if (i + sentencesPerChunk >= sentences.length) break;
  }

  return chunks;
}