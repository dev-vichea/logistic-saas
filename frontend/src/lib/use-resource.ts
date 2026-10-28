"use client";
import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
export function useResource<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!url) return;
    let active = true;
    const controller = new AbortController();
    api
      .get<T>(url, { signal: controller.signal })
      .then((r) => {
        if (active) {
          setData(r.data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, version]);
  return { data, error, reload };
}
