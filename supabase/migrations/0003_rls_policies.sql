-- ============================================================
-- Row Level Security policies
-- ============================================================
-- Scope decision: this assessment doesn't implement per-agent Supabase
-- Auth (no login flow — Part 1 asks for one well-built slice, not a
-- full identity system). So these policies are intentionally
-- permissive: any request bearing the anon key can read/write.
--
-- This is NOT how it would work in production. In production, each
-- agent would authenticate via Supabase Auth, and every policy below
-- would instead check something like:
--   brand_id IN (SELECT brand_id FROM agent_brand_access WHERE agent_id = auth.uid())
-- so an agent at Brand A can never read/write Brand B's data. That
-- exact mechanism — and how it scales to 500 brands / 5,000 agents —
-- is addressed in Part 2 (System Design).
--
-- For this build, the goal is to demonstrate the AI reply pipeline and
-- guardrails end-to-end, not reimplement multi-tenant auth. RLS is left
-- ENABLED (not disabled) so the schema is still "secure by default" —
-- these policies are the explicit, intentional exception.
-- ============================================================

create policy "allow read brands" on brands for select using (true);
create policy "allow read customers" on customers for select using (true);
create policy "allow read orders" on orders for select using (true);

create policy "allow read conversations" on conversations for select using (true);
create policy "allow update conversations" on conversations for update using (true);

create policy "allow read messages" on messages for select using (true);
create policy "allow insert messages" on messages for insert with check (true);

create policy "allow read knowledge_docs" on knowledge_docs for select using (true);

create policy "allow read reply_logs" on reply_logs for select using (true);
create policy "allow insert reply_logs" on reply_logs for insert with check (true);
create policy "allow update reply_logs" on reply_logs for update using (true);