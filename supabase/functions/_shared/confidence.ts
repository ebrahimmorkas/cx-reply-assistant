/**
 * Combines two independent signals into a final confidence level:
 *   1. Retrieval score (from Qdrant) — how well the top matching policy
 *      chunk actually matches the customer's message, semantically.
 *   2. The model's own self-reported `sufficient_context` flag.
 *
 * Deliberately NOT trusting the LLM's self-report alone — models are
 * prone to sounding confident even when wrong. Combining it with an
 * independent, non-LLM signal (retrieval score) means a hallucinated
 * "yes, sufficient" from the model can still be caught if the actual
 * retrieved text was a weak match.
 *
 * Thresholds (0.35 / 0.30) are calibrated from manual testing in 1B —
 * see README for the observed scores: a genuine on-topic match scored
 * ~0.44-0.55, unrelated policy noise scored ~0.19-0.27.
 */

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