export function todayInSydneyISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";

  return `${y}-${m}-${d}`;
}

export function addDaysISO(dateISO: string, deltaDays: number): string {
  const [y, m, d] = dateISO.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function startOfWeekISO(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map((n) => Number(n));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  // Week starts Monday.
  const day = dt.getUTCDay(); // 0..6 (Sun..Sat)
  const deltaToMonday = (day + 6) % 7;
  return addDaysISO(dateISO, -deltaToMonday);
}

export function startOfMonthISO(dateISO: string): string {
  const [y, m] = dateISO.split("-").map((n) => Number(n));
  const yy = Number.isFinite(y) ? y : 1970;
  const mm = Number.isFinite(m) ? m : 1;
  const dt = new Date(Date.UTC(yy, mm - 1, 1));
  return dt.toISOString().slice(0, 10);
}
