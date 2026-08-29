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