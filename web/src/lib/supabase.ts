import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env file at the project root."
  );
}

// Frontend uses the anon key only — never the service_role key, which
// must stay server-side (ingestion scripts, Edge Functions).
export const supabase = createClient(url, anonKey);