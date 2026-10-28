"use client";
import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { Department, Paginated } from "@/lib/types";
export function useDepartments(organizationId?: number) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    const controller = new AbortController();
    (async () => {
      const all: Department[] = [];
      let page = 1,
        last = 1;
      do {
        const { data } = await api.get<Paginated<Department>>(
          `/api/v1/organizations/${organizationId}/departments?page=${page}`,
          { signal: controller.signal },
        );
        all.push(...data.data);
        last = data.last_page;
        page++;
      } while (page <= last);
      if (active) setDepartments(all);
    })().catch((e) => {
      if (active) setError(errorMessage(e));
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [organizationId]);
  return { departments, error };
}
