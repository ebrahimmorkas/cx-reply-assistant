-- ============================================================
-- Datastraw CX Reply Assistant — Initial Schema
-- ============================================================
-- Design notes:
-- - Every table carries brand_id (directly or via FK chain) so that
--   Row Level Security policies can enforce brand isolation later.
-- - reply_logs captures the full lifecycle of a generated reply:
--   customer message -> retrieved KB context -> AI draft -> agent edit
--   -> final approved response. This satisfies the "Data & Logging"
--   requirement in the assessment.
-- - knowledge_docs holds the canonical policy text. Qdrant stores
--   embeddings of chunks derived from this table (see 1B), keyed back
--   to knowledge_docs.id so we can always trace a retrieved chunk to
--   its source document.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Brands ----------
create table brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Customers ----------
create table customers (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now()
);
create index idx_customers_brand on customers(brand_id);

-- ---------- Orders (mocked order data) ----------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  order_number text not null,
  item_description text not null,
  status text not null default 'delivered', -- placed | shipped | delivered | cancelled
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_orders_brand on orders(brand_id);
create index idx_orders_customer on orders(customer_id);

-- ---------- Conversations ----------
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  channel text not null default 'whatsapp', -- whatsapp | email | chat
  status text not null default 'open', -- open | pending | resolved
  created_at timestamptz not null default now()
);
create index idx_conversations_brand on conversations(brand_id);
create index idx_conversations_customer on conversations(customer_id);

-- ---------- Messages ----------
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_type text not null, -- customer | agent | ai
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on messages(conversation_id);

-- ---------- Knowledge Base (source documents) ----------
create table knowledge_docs (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references brands(id) on delete cascade,
  category text not null, -- return | refund | shipping | cancellation
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index idx_knowledge_docs_brand on knowledge_docs(brand_id);
create index idx_knowledge_docs_category on knowledge_docs(category);

-- ---------- Reply Logs (the audit trail the assessment asks for) ----------
create table reply_logs (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  customer_message text not null,
  retrieved_context jsonb not null default '[]'::jsonb, -- array of {doc_id, title, snippet, score}
  ai_response text,
  agent_edited_response text,
  final_response text,
  status text not null default 'generated', -- generated | edited | approved
  confidence text, -- high | low | insufficient_context (guardrail output)
  created_at timestamptz not null default now()
);
create index idx_reply_logs_conversation on reply_logs(conversation_id);
create index idx_reply_logs_brand on reply_logs(brand_id);

-- ============================================================
-- Row Level Security (enabled now, policies refined once Auth/roles
-- are wired in — placeholder deny-all-by-default until app role exists)
-- ============================================================
alter table brands enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table knowledge_docs enable row level security;
alter table reply_logs enable row level security;