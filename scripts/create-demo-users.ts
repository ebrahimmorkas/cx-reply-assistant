/**
 * Creates real Supabase Auth users for the demo: one agent and the two
 * seeded customers, then links them into our schema (agents +
 * agent_brand_access for the agent; customers.auth_user_id for the
 * customers). Uses the service_role key via the Auth Admin API, since
 * creating users this way requires elevated privileges — this should
 * only ever be run from a trusted environment, never the frontend.
 *
 * Safe to re-run: it looks up existing auth users by email before
 * creating a new one, so re-running won't create duplicates.
 *
 * Run with: npm run create-demo-users
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const DEMO_PASSWORD = "Demo1234!"; // documented demo credential, not a real secret

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOrCreateAuthUser(email: string) {
  // The admin API doesn't have a direct "get by email", so we page
  // through users — fine at demo scale, would need a real lookup at
  // production scale.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    console.log(`  already exists: ${email}`);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`  created: ${email}`);
  return data.user;
}

async function main() {
  console.log("Setting up demo agent...");
  const agentEmail = "agent@hydrabottle.com";
  const agentUser = await findOrCreateAuthUser(agentEmail);

  const { data: brand, error: brandErr } = await supabase
    .from("brands")
    .select("id, name")
    .limit(1)
    .single();
  if (brandErr || !brand) throw brandErr ?? new Error("No brand found — run 0002_seed.sql first");

  const { error: agentUpsertErr } = await supabase
    .from("agents")
    .upsert({ id: agentUser.id, name: "Demo Agent", email: agentEmail });
  if (agentUpsertErr) throw agentUpsertErr;

  const { error: accessErr } = await supabase
    .from("agent_brand_access")
    .upsert({ agent_id: agentUser.id, brand_id: brand.id });
  if (accessErr) throw accessErr;

  console.log(`  linked to brand: ${brand.name}`);

  console.log("\nSetting up demo customers...");
  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("id, name, email");
  if (custErr) throw custErr;

  for (const customer of customers ?? []) {
    if (!customer.email) {
      console.log(`  skipping ${customer.name} — no email on file`);
      continue;
    }
    const custUser = await findOrCreateAuthUser(customer.email);
    const { error: linkErr } = await supabase
      .from("customers")
      .update({ auth_user_id: custUser.id })
      .eq("id", customer.id);
    if (linkErr) throw linkErr;
    console.log(`  linked ${customer.name} (${customer.email})`);
  }

  console.log("\nDone. Demo credentials (all use the same password):");
  console.log(`  Password for all accounts: ${DEMO_PASSWORD}`);
  console.log(`  Agent login:    ${agentEmail}`);
  for (const customer of customers ?? []) {
    if (customer.email) console.log(`  Customer login: ${customer.email} (${customer.name})`);
  }
}

main().catch((err) => {
  console.error("Failed to set up demo users:", err);
  process.exit(1);
});