import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Customer } from "../types";

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
}

export function useAgentProfile(session: Session | null) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setAgent(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("agents")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        setAgent(data ?? null);
        setLoading(false);
      });
  }, [userId]);

  return { agent, loading };
}

export function useCustomerProfile(session: Session | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("customers")
      .select("*")
      .eq("auth_user_id", userId)
      .single()
      .then(({ data }) => {
        setCustomer(data ?? null);
        setLoading(false);
      });
  }, [userId]);

  return { customer, loading };
}