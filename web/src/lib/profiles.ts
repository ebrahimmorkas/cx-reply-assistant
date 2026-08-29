import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Customer } from "../types";

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
}

/** Resolves the session into an agent row, if one exists. A session
 * belonging to a customer (not an agent) simply resolves to null here —
 * RLS on the agents table means the query only ever returns your own
 * row anyway, but we still check explicitly so route guards are clear. */
export function useAgentProfile(session: Session | null) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setAgent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("agents")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => {
        setAgent(data ?? null);
        setLoading(false);
      });
  }, [session]);

  return { agent, loading };
}

export function useCustomerProfile(session: Session | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .single()
      .then(({ data }) => {
        setCustomer(data ?? null);
        setLoading(false);
      });
  }, [session]);

  return { customer, loading };
}