export type ConfidenceLevel = "high" | "low" | "insufficient_context";

const STRONG_MATCH_THRESHOLD = 0.35;
const WEAK_MATCH_FLOOR = 0.3;

export function computeConfidence(
  topRetrievalScore: number,
  modelSaysSufficient: boolean
): ConfidenceLevel {
  if (!modelSaysSufficient) return "insufficient_context";
  if (topRetrievalScore < WEAK_MATCH_FLOOR) return "insufficient_context";
  if (topRetrievalScore < STRONG_MATCH_THRESHOLD) return "low";
  return "high";
}