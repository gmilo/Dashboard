import { config } from "@/lib/config";
import { fetchJson } from "@/lib/fetch";

export type ShiftBreak = {
  time_start: string;
  time_end: string;
};

export type ShiftClock = {
  id: number;
  time_start: string;
  time_end: string; // "ACTIVE" or "h:iA" etc
  image_start?: string;
  image_end?: string;
  date?: string;
  breaks?: ShiftBreak[];
};

export type ShiftItem = {
  type: "active" | "scheduled";
  employee_id: number;
  name: string;
  avatar?: string | null;
  total_cost: number;
  shifts: ShiftClock[];
  scheduled?: ShiftClock[];
};

export type ShiftsResponse = {
  success: boolean;
  total_cost: number;
  all_shifts: ShiftItem[];
  error?: string;
  html?: string;
  widget?: string;
};

export async function getShifts(params: { companyId: number; dateFrom: string; dateTo: string }): Promise<ShiftsResponse> {
  const url = new URL(`${config.ajaxBaseUrl}/shifts.php`);
  url.searchParams.set("action", "get_shifts");
  url.searchParams.set("company_id", String(params.companyId));
  url.searchParams.set("date_from", params.dateFrom);
  url.searchParams.set("date_to", params.dateTo);

  const json = await fetchJson<ShiftsResponse>(url, { cache: "no-store" });
  if (!json.success) throw new Error(json.error ?? "shifts failed");
  return json;
}

