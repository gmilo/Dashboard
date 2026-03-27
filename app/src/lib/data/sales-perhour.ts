import { config } from "@/lib/config";
import { fetchJson } from "@/lib/fetch";
import { addDaysISO } from "@/lib/dates";

type SalesPerHourDay = {
  count: number; // drinks sold (qty)
  orders: number; // txn count
  total_amount_drinks: string; // "123.45"
  total_amount: string; // "123.45"
  axis: string[];
  data: Array<[string, number, number, number, number]>;
};

export type SalesPerHourResponse = {
  success: boolean;
  data: Record<string, SalesPerHourDay>;
  error?: string;
};

export async function getSalesPerHourBundle(params: {
  companyId: number;
  date: string;
}): Promise<{ today: SalesPerHourDay; yesterday?: SalesPerHourDay }> {
  const url = new URL(`${config.dataBaseUrl}/sales-perhour.php`);
  url.searchParams.set("company_id", String(params.companyId));
  url.searchParams.set("date", params.date);

  const json = await fetchJson<SalesPerHourResponse>(url, { cache: "no-store" });
  if (!json.success) throw new Error(json.error ?? "sales-perhour failed");

  const todayKey = params.date;
  const yesterdayKey = addDaysISO(params.date, -1);

  const today = json.data[todayKey] ?? json.data[Object.keys(json.data)[0] ?? ""];
  if (!today) throw new Error("No data returned");

  const yesterday = json.data[yesterdayKey];

  return { today, yesterday };
}
