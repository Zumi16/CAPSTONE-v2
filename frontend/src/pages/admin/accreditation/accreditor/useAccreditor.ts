import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { getStoredAccreditationUser, type AccreditationUser } from "@/lib/adminAuth";

/**
 * Shared bootstrap for the three Accreditor pages: read the logged-in user,
 * fetch the active cycle, then resolve which areas this accreditor is assigned
 * to (each area exposes its accreditors via a separate endpoint).
 */

export type Cycle = { id: number; academic_year: string };
export type AssignedArea = { area_id: number; area_number: number; area_name: string; total_sections: number };
export type Section = {
  section_id: number;
  section_name: string;
  area_id?: number;
  area_number: number;
  area_name: string;
  google_drive_link?: string;
  review_status?: string;
  submitted_at?: string;
  reviewed_at?: string;
  comments?: string;
  accreditor_id?: number;
};
export type Review = {
  section_id: number;
  section_name: string;
  area_id?: number;
  area_number: number;
  area_name?: string;
  review_status?: string;
  google_drive_link?: string;
  reviewed_at?: string;
  comments?: string;
  accreditor_id?: number;
};

export type AccreditorState = "loading" | "no-user" | "no-cycle" | "no-area" | "ready";

export function useAccreditor() {
  const [user] = useState<AccreditationUser | null>(() => getStoredAccreditationUser());
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [areas, setAreas] = useState<AssignedArea[]>([]);
  const [state, setState] = useState<AccreditorState>("loading");

  useEffect(() => {
    if (!user) { setState("no-user"); return; }
    let cancelled = false;
    (async () => {
      try {
        const c = await api.get<{ cycle?: Cycle }>("/api/accreditation/cycle/active");
        if (cancelled) return;
        if (!c.cycle) { setState("no-cycle"); return; }
        setCycle(c.cycle);
        const a = await api.get<{ areas?: (AssignedArea & { area_id: number })[] }>(`/api/accreditation/areas/${c.cycle.id}`);
        if (cancelled) return;
        const all = a.areas ?? [];
        const checks = await Promise.all(all.map(async (area) => {
          try {
            const r = await api.get<{ accreditors?: { accreditor_id: number }[] }>(`/api/accreditation/area/${c.cycle!.id}/${area.area_id}/accreditors`);
            const mine = r.accreditors?.some((x) => x.accreditor_id === user.id);
            return mine ? { area_id: area.area_id, area_number: area.area_number, area_name: area.area_name, total_sections: area.total_sections } : null;
          } catch { return null; }
        }));
        if (cancelled) return;
        const assigned = checks.filter((x): x is AssignedArea => x !== null);
        if (assigned.length === 0) { setState("no-area"); return; }
        setAreas(assigned);
        setState("ready");
      } catch {
        if (!cancelled) setState("no-cycle");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return { user, cycle, areas, state };
}

export function reviewBadge(status?: string) {
  if (status === "Complete") return { cls: "badge-green", icon: "fa-check-circle", label: "Complete" };
  if (status === "Needs Revision") return { cls: "badge-yellow", icon: "fa-exclamation-triangle", label: "Needs Revision" };
  if (status === "Incomplete") return { cls: "badge-red", icon: "fa-times-circle", label: "Incomplete" };
  if (!status || status === "Not Reviewed") return { cls: "badge-gray", icon: "fa-clock", label: "Not Reviewed" };
  return { cls: "badge-gray", icon: "", label: "-" };
}
