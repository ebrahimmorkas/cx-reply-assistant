import { useEffect, useRef } from "react";
import { supabase } from "./supabase";

export function useRealtimeRefresh(onChange: () => void) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const channel = supabase
      .channel("live-conversations")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        onChangeRef.current()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, () =>
        onChangeRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}