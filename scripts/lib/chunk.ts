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