import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { getStoredAccreditationUser, type AccreditationUser } from "@/lib/adminAuth";

/**
 * Shared bootstrap for the three Area Head pages. Each legacy page repeated the
 * same chain: read the logged-in accreditation user, fetch the active cycle,
 * then find the area whose `area_head_id` is this user. This hook centralises
 * that and exposes a coarse `state` so pages can render the right placeholder.
 */

export type Cycle = { id: number; academic_year: string };
export type Area = { area_id: number; area_number: number; area_name: string; area_head_id: number };
export type Section = {
  section_id: number;
  section_name: string;
  google_drive_link?: string;
  review_status?: string;
  is_locked?: boolean;
  submitted_at?: string;
  reviewed_at?: string;
};

export type AreaHeadState = "loading" | "no-user" | "no-cycle" | "no-area" | "ready";

export function useAreaHead() {
  const [user] = useState<AccreditationUser | null>(() => getStoredAccreditationUser());
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [state, setState] = useState<AreaHeadState>("loading");

  useEffect(() => {
    if (!user) {
      setState("no-user");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await api.get<{ cycle?: Cycle }>("/api/accreditation/cycle/active");
        if (cancelled) return;
        if (!c.cycle) {
          setState("no-cycle");
          return;
        }
        setCycle(c.cycle);
        const a = await api.get<{ areas?: Area[] }>(`/api/accreditation/areas/${c.cycle.id}`);
        if (cancelled) return;
        const mine = (a.areas ?? []).find((x) => x.area_head_id === user.id) ?? null;
        if (!mine) {
          setState("no-area");
          return;
        }
        setArea(mine);
        setState("ready");
      } catch {
        if (!cancelled) setState("no-cycle");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { user, cycle, area, state };
}

/** Review-status badge shared by Area Head tables. */
export function reviewBadge(status?: string) {
  if (!status || status === "Not Reviewed") return { cls: "badge-gray", icon: "fa-clock", label: "Not Reviewed" };
  if (status === "Complete") return { cls: "badge-green", icon: "fa-check-circle", label: "Complete" };
  if (status === "Needs Revision") return { cls: "badge-yellow", icon: "fa-exclamation-triangle", label: "Needs Revision" };
  if (status === "Incomplete") return { cls: "badge-red", icon: "fa-times-circle", label: "Incomplete" };
  return { cls: "badge-gray", icon: "", label: "-" };
}
