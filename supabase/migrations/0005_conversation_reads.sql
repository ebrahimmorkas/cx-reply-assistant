create table conversation_reads (
  agent_id uuid not null references agents(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (agent_id, conversation_id)
);

alter table conversation_reads enable row level security;

create policy "agents manage own read state" on conversation_reads
  for all
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());