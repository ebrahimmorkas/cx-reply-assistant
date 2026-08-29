-- ============================================================
-- Real authentication, real RLS, and Realtime
-- ============================================================
-- Replaces the permissive placeholder policies from 0003 (which were
-- explicitly documented as a scope decision deferring real auth) with
-- actual per-role enforcement now that we're adding Supabase Auth for
-- two roles: agents (admin side) and customers (client side).
-- ============================================================

-- ---------- Auth-linked tables ----------

-- One row per agent, keyed by their Supabase Auth user id.
create table agents (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- Which brands an agent can access — the real version of the
-- multi-tenant isolation mechanism described in the Part 2 document.
create table agent_brand_access (
  agent_id uuid not null references agents(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  primary key (agent_id, brand_id)
);

-- Link each customer row to their own Supabase Auth user, so a
-- customer's RLS policies can check "is this really you" directly.
alter table customers add column auth_user_id uuid references auth.users(id);

alter table agents enable row level security;
alter table agent_brand_access enable row level security;

-- Agents can see their own row and their own brand access list —
-- needed so the frontend can look up "which brands can I access"
-- right after login.
create policy "agents read own row" on agents for select using (id = auth.uid());
create policy "agents read own access" on agent_brand_access for select using (agent_id = auth.uid());

-- ---------- Drop the old permissive (Part 1 scope-decision) policies ----------

drop policy if exists "allow read brands" on brands;
drop policy if exists "allow read customers" on customers;
drop policy if exists "allow read orders" on orders;
drop policy if exists "allow read conversations" on conversations;
drop policy if exists "allow update conversations" on conversations;
drop policy if exists "allow read messages" on messages;
drop policy if exists "allow insert messages" on messages;
drop policy if exists "allow read knowledge_docs" on knowledge_docs;
drop policy if exists "allow read reply_logs" on reply_logs;
drop policy if exists "allow insert reply_logs" on reply_logs;
drop policy if exists "allow update reply_logs" on reply_logs;

-- ---------- Real agent policies (brand-scoped via agent_brand_access) ----------

create policy "agents read brands" on brands for select
  using (id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents read customers" on customers for select
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents read orders" on orders for select
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents read conversations" on conversations for select
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents update conversations" on conversations for update
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents read messages" on messages for select
  using (conversation_id in (
    select id from conversations
    where brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid())
  ));

create policy "agents insert messages" on messages for insert
  with check (
    sender_type in ('agent', 'ai')
    and conversation_id in (
      select id from conversations
      where brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid())
    )
  );

create policy "agents read knowledge_docs" on knowledge_docs for select
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents read reply_logs" on reply_logs for select
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents insert reply_logs" on reply_logs for insert
  with check (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

create policy "agents update reply_logs" on reply_logs for update
  using (brand_id in (select brand_id from agent_brand_access where agent_id = auth.uid()));

-- ---------- Real customer (client portal) policies ----------
-- A customer can only ever see or touch their OWN conversation —
-- scoped through auth_user_id, never through a client-supplied id.

create policy "customers read own row" on customers for select
  using (auth_user_id = auth.uid());

create policy "customers read own conversations" on conversations for select
  using (customer_id in (select id from customers where auth_user_id = auth.uid()));

create policy "customers create own conversation" on conversations for insert
  with check (customer_id in (select id from customers where auth_user_id = auth.uid()));

create policy "customers read own messages" on messages for select
  using (conversation_id in (
    select c.id from conversations c
    join customers cu on cu.id = c.customer_id
    where cu.auth_user_id = auth.uid()
  ));

create policy "customers send own messages" on messages for insert
  with check (
    sender_type = 'customer'
    and conversation_id in (
      select c.id from conversations c
      join customers cu on cu.id = c.customer_id
      where cu.auth_user_id = auth.uid()
    )
  );

-- ---------- Enable Realtime ----------
-- Lets both the admin panel and the client portal subscribe to live
-- inserts instead of polling.

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;