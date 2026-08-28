# Datastraw CX Reply Assistant

AI-powered reply assistant for CX agents — Part 1 of the Datastraw technical assessment.

**Live demo:** https://cx-reply-assistant-six.vercel.app/
**Repo:** (add your GitHub URL here)

Try the three scenarios pre-loaded in the seed data to see the guardrail in
action — see "Testing the guardrail" below for exact steps and expected
results.

## Stack
- **Frontend**: React + TypeScript + Vite + Tailwind, deployed on Vercel
- **Backend**: Supabase Edge Functions (Deno + TypeScript)
- **Database**: PostgreSQL (Supabase)
- **Vector search**: Qdrant Cloud
- **Embeddings**: HuggingFace Inference API (`sentence-transformers/all-MiniLM-L6-v2`)
- **LLM**: Groq (`openai/gpt-oss-120b`), called through a swappable
  `chatCompletion()` abstraction (`_shared/groq.ts`) so switching providers
  (e.g. to OpenRouter/DeepInfra, both in Datastraw's listed stack) later is a
  one-line change, not a rewrite.

## Status
- [x] 1A — DB schema + seed data
- [x] 1B — Knowledge base ingestion into Qdrant + retrieval
- [x] 1C — Conversation UI
- [x] 1D — Generate Reply flow (retrieval → prompt → guardrails → edit/approve)
- [x] 1E — Logging verification + deployment

## 1A: Database setup

1. Create a Supabase project (see setup steps shared earlier).
2. Copy `.env.example` to `.env` and fill in your real keys — **never commit `.env`**.
3. Apply the migrations, either via the Supabase SQL editor (paste file contents
   in order) or via the Supabase CLI:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

4. Migration files, applied in order:
   - `supabase/migrations/0001_init.sql` — schema (brands, customers, orders,
     conversations, messages, knowledge_docs, reply_logs)
   - `supabase/migrations/0002_seed.sql` — seed data: one brand ("HydraBottle
     Co."), 4 policy docs, 2 customers/orders/conversations pre-loaded with the
     exact scenarios from the assessment brief (broken bottle; refund outside
     the 7-day window) so the app is demoable immediately after setup.

## Schema notes

Every table carries `brand_id` (directly or via a foreign-key chain) so Row
Level Security can enforce brand isolation — every table currently has RLS
**enabled** but policies are intentionally deferred until Supabase Auth /
agent roles are wired in (1C/1D), to avoid locking ourselves out during
early development.

`reply_logs` is the audit trail required by the assessment: it captures the
customer message, the retrieved KB context (as JSON, keyed back to
`knowledge_docs.id`), the AI-generated draft, any agent edit, the final
approved response, a status, and a `confidence` field used by the guardrail
logic (1D) to flag when the AI shouldn't answer confidently.

## 1B: Knowledge base ingestion + retrieval

Policy text lives in Postgres (`knowledge_docs`) as the source of truth.
Qdrant stores **embeddings of small chunks** of that text for semantic
search — Postgres and Qdrant are kept in sync by re-running the ingestion
script whenever policy content changes.

**How it works:**
1. `scripts/lib/chunk.ts` splits each doc into ~2-sentence chunks with
   1-sentence overlap, so a nuance spanning a sentence boundary isn't lost.
2. `scripts/lib/embeddings.ts` calls HuggingFace's Inference API
   (`sentence-transformers/all-MiniLM-L6-v2`, 384-dim vectors) to embed
   each chunk. The *same* function is reused at query time, since a
   customer's message must be embedded with the identical model to be
   comparable to the stored vectors.
3. `scripts/lib/qdrant.ts` is a minimal REST client (no SDK) for creating
   the collection, upserting points, and searching — kept dependency-free
   so the same code can later be copied into the Deno Edge Function (1D)
   without a Node/Deno compatibility fight.
4. `scripts/ingest-knowledge.ts` ties it together: reads all
   `knowledge_docs` rows → chunks → embeds → upserts into Qdrant, tagged
   with `brand_id` and `doc_id` so retrieval can be **filtered per brand**
   (critical for multi-tenant isolation — Brand A must never see Brand B's
   policy text) and every retrieved chunk can be traced back to its source
   document for the audit log.

**Setup:**
```bash
npm install
npm run ingest
```

**Verify retrieval works:**
```bash
npm run test-retrieval "My order was delivered but the bottle is broken"
npm run test-retrieval "I received this 20 days ago, can I get a refund?"
```
The first should surface the Return Policy's damaged-item clause; the
second should surface the Refund Policy's 7-day window — this second case
is also our guardrail test (1D): the AI should recognize the request falls
outside the window rather than confidently approving a refund.

## 1D: Generate Reply flow

The core of the assessment. A Supabase Edge Function (`supabase/functions/generate-reply/`)
runs the full pipeline server-side, called from the "Generate Reply" button in the UI.

**Pipeline** (see `index.ts` for the orchestration):
1. Load the conversation, customer, latest order, and brand from Postgres
2. Embed the customer's latest message via HuggingFace (same model as 1B)
3. Search Qdrant for the top 4 matching policy chunks, filtered to the conversation's brand
4. Build a grounded prompt (`_shared/prompt.ts`) that instructs the model to answer
   **only** from the retrieved policy text, and to self-report whether that text
   actually covers the situation (`sufficient_context: true|false`)
5. Call Groq, parse the structured JSON response
6. Compute a final confidence level (`_shared/confidence.ts`) by combining the
   retrieval score with the model's self-report — the model's word alone is
   never trusted, since retrieval score is an independent, non-LLM signal
7. Write a full audit row to `reply_logs`
8. Return the draft to the frontend

**The guardrail, concretely:** confidence is `insufficient_context` whenever
either (a) the model itself says the policy doesn't clearly cover the
situation, or (b) the best-matching policy chunk scored below a
similarity floor — meaning even if the model sounds confident, weak
retrieval evidence overrides it. `low` means the model answered but either
retrieval was borderline or the model flagged some uncertainty. Only `high`
means both signals agree the answer is well-grounded.

**Frontend flow:** clicking "Generate Reply" calls the Edge Function and shows
the draft in a panel above the composer, with the confidence badge, the
retrieved policy sources (expandable), and Regenerate / Discard / Approve &
Send actions. The agent can freely edit the draft text before approving —
edits are tracked (`reply_logs.status` becomes `edited` instead of `approved`,
and the edited text is stored separately in `agent_edited_response`) so the
audit trail shows exactly what the AI proposed versus what was actually sent.

**Deploying the function:**
```bash
supabase functions deploy generate-reply
supabase secrets set HF_API_KEY=... QDRANT_URL=... QDRANT_API_KEY=... QDRANT_COLLECTION=knowledge_chunks GROQ_API_KEY=... GROQ_MODEL=openai/gpt-oss-120b
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by
Supabase for Edge Functions — no need to set them manually.

**Testing the guardrail:** open the "20 days ago, can I get a refund?"
conversation (Rohan Mehta) and click Generate Reply — the policy clearly caps
refunds at 7 days, so this should surface as `low` or `insufficient_context`
confidence rather than a confident refund promise.

## 1E: Logging verification + deployment

**Logging.** Every "Generate Reply" click — not just approved ones — writes a
full row to `reply_logs`, confirmed by querying the table directly after
exercising all three confidence paths:

```sql
select customer_message, confidence, status, ai_response, final_response,
       jsonb_array_length(retrieved_context) as num_sources, created_at
from reply_logs order by created_at desc;
```

Verified: `confidence` matches what the UI badge showed in every case;
`final_response` is populated only for the row that was actually approved
and sent (everything else correctly stays `null` — a viewed draft is not a
sent message); `num_sources` is consistently 4; every row shares the same
`brand_id`, which is the mechanism that keeps replies scoped to one brand's
policies (see Part 2 for how this scales to 500 brands).

**Deployment.**
- Frontend: pushed to GitHub, deployed on Vercel with root directory `web`,
  environment variables limited to `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` — the anon key is safe to expose client-side
  (that's its purpose; real access control is RLS + policies, not secrecy),
  while Groq/Qdrant/HuggingFace/service-role keys never leave the Edge
  Function's server-side environment.
- Backend: the `generate-reply` Edge Function deployed via
  `supabase functions deploy`, secrets set via `supabase secrets set`.
- Both verified live: conversations load correctly and Generate Reply works
  end-to-end (all three confidence scenarios) on the deployed URL, not just
  localhost.

## Engineering decisions & tradeoffs

A few choices worth calling out explicitly, since reasoning about tradeoffs
was emphasized as much as the working code:

- **Qdrant over pgvector**, despite the extra moving part, specifically to
  match Datastraw's stated production stack and to have real hands-on
  experience with it going into the Part 2 system design discussion.
- **Groq instead of OpenRouter/DeepInfra** (both of which *are* in
  Datastraw's listed stack) purely for a free, fast dev loop while building.
  This is a deliberate deviation, made swappable on purpose
  (`_shared/groq.ts` is the only file that would need to change) — in a real
  production rollout I'd re-evaluate against OpenRouter for model
  flexibility and DeepInfra for cost at scale.
- **Confidence is two independent signals combined, not the LLM's word
  alone** (`_shared/confidence.ts`): the model's self-reported
  `sufficient_context` flag, combined with the raw Qdrant similarity score.
  An LLM can sound confident while being wrong; requiring a second,
  non-LLM signal to agree is what makes the guardrail meaningfully more
  robust than just asking the model to grade its own homework.
- **RLS is enabled everywhere but policies are currently permissive**
  (`0003_rls_policies.sql`), documented explicitly as a scope decision —
  this assessment doesn't implement Supabase Auth / per-agent login, so
  building real per-brand row policies would just be theater without an
  `auth.uid()` to check against. The schema is structured so real policies
  (checking brand access per authenticated agent) are a small addition once
  auth exists, not a redesign — that mechanism and how it holds up at 500
  brands / 5,000 agents is the subject of Part 2.
- **Chunking is small and simple** (~2 sentences, 1-sentence overlap) —
  appropriately sized for 4 short policy docs, but structured the same way
  it would need to be for much longer real-world policy documents, so the
  pattern (not just the current parameters) is what's being demonstrated.
- **Scope boundary**: deliberately did not build a full CRM, ticket
  management, multi-channel inbox, or authentication system — per the
  assessment's own guidance to build "one well-built slice" rather than a
  shallow layer over many features.

## What I'd change for production

- Real Supabase Auth with per-agent brand access, replacing the permissive
  RLS policies with actual `auth.uid()`-scoped checks.
- Rate limiting / retry logic on the three external API calls in the Edge
  Function pipeline (HuggingFace, Qdrant, Groq) — currently a transient
  failure in any one of them fails the whole request with no retry.
- Streaming the Groq response instead of waiting for the full JSON object,
  to cut perceived latency in the UI.
- A feedback loop where agent edits to AI drafts get reviewed periodically —
  frequent edits to a specific policy area would be a signal that policy
  doc's phrasing (or the confidence threshold) needs tuning.