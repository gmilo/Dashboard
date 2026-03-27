import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { config } from "@/lib/config";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type UpstreamResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

type CashupEntry = {
  company_id: number;
  company_name: string;
  type: "cashin" | "cashup";
  by?: string | null;
  avatar?: string | null;
  photos: string[];
  total?: number | null;
  actual?: number | null;
  system?: number | null;
  variance?: number | null;
  created_at?: string | null;
};

function parseMoney(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number" && Number.isFinite(input)) return input;
  const s = String(input);
  if (!s.trim()) return null;
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

function isUrl(s: unknown): s is string {
  if (typeof s !== "string") return false;
  return s.startsWith("http://") || s.startsWith("https://");
}

function normalizeType(input: unknown): "cashin" | "cashup" | null {
  const s = String(input ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("cashin") || s === "in" || s === "cash_in") return "cashin";
  if (s.includes("cashup") || s === "up" || s === "cash_up") return "cashup";
  return null;
}

function extractEntries(data: unknown, allowedCompanyIds: Set<number>, fallbackCompanyName: (id: number) => string): CashupEntry[] {
  const out: CashupEntry[] = [];

  const normalizeEntry = (entry: Record<string, unknown>, companyId: number, companyName: string, fallbackType: "cashin" | "cashup" | null) => {
    const type =
      normalizeType(entry.type) ||
      normalizeType(entry.cash_type) ||
      normalizeType(entry.cashup_type) ||
      normalizeType(entry.cashupType) ||
      (fallbackType ?? "cashup");

    let by =
      (typeof entry.by === "string" && entry.by) ||
      (typeof entry.user === "string" && entry.user) ||
      (typeof entry.name === "string" && entry.name) ||
      (typeof entry.created_by === "string" && entry.created_by) ||
      null;

    const nameFirst = typeof entry.name_first === "string" ? entry.name_first : typeof entry.first_name === "string" ? entry.first_name : null;
    const nameLast = typeof entry.name_last === "string" ? entry.name_last : typeof entry.last_name === "string" ? entry.last_name : null;
    if (!by) {
      const full = [nameFirst, nameLast].filter(Boolean).join(" ").trim();
      by = full ? full : null;
    }

    const avatar = typeof entry.avatar === "string" ? entry.avatar : null;

    const photos: string[] = [];
    const photoCandidates = [
      entry.cash_drop_image_url,
      entry.photo,
      entry.image,
      entry.image_url,
      entry.image_start,
      entry.image_end,
      entry.photo_url,
      entry.photo1,
      entry.photo2
    ];
    for (const p of photoCandidates) if (isUrl(p)) photos.push(p);
    if (Array.isArray(entry.photos)) for (const p of entry.photos) if (isUrl(p)) photos.push(p);
    if (Array.isArray(entry.images)) for (const p of entry.images) if (isUrl(p)) photos.push(p);

    const total = parseMoney(entry.total ?? entry.total_amount ?? entry.amount_total);
    const actual = parseMoney(entry.actual ?? entry.actual_amount ?? entry.amount_actual);
    const system = parseMoney(entry.system ?? entry.system_total ?? entry.system_amount ?? entry.amount_system);
    const varianceProvided = parseMoney(entry.variance ?? entry.plus_minus ?? entry.diff ?? entry.delta);
    const variance = varianceProvided ?? (actual !== null && system !== null ? actual - system : null);

    const createdAt =
      typeof entry.created_at === "string"
        ? entry.created_at
        : typeof entry.created === "string"
          ? entry.created
          : typeof entry.createdAt === "string"
            ? entry.createdAt
            : null;

    return {
      company_id: companyId,
      company_name: companyName,
      type,
      by,
      avatar,
      photos: Array.from(new Set(photos)),
      total,
      actual,
      system,
      variance,
      created_at: createdAt
    } satisfies CashupEntry;
  };

  const visitCompanyBlock = (company: Record<string, unknown>) => {
    const cid = toNumber(company.company_id);
    if (cid === null || !allowedCompanyIds.has(cid)) return;
    const cname = (typeof company.company_name === "string" && company.company_name.trim()) || fallbackCompanyName(cid);

    const maybeArrays: Array<[unknown, unknown]> = [
      ["cashin", company.cashin],
      ["cashup", company.cashup],
      ["cashins", company.cashins],
      ["cashups", company.cashups],
      ["cash_in", company.cash_in],
      ["cash_up", company.cash_up],
      ["entries", company.entries],
      ["records", company.records],
      ["items", company.items],
      ["data", company.data]
    ];

    for (const [label, val] of maybeArrays) {
      const t = normalizeType(label);
      if (!t) continue;
      if (!Array.isArray(val)) continue;
      for (const item of val) {
        if (!item || typeof item !== "object") continue;
        out.push(normalizeEntry(item as Record<string, unknown>, cid, cname, t));
      }
    }

    // Common legacy shape: { company_id, data: { CashIn: {...}, CashUp: {...} } }
    if (company.data && typeof company.data === "object" && !Array.isArray(company.data)) {
      for (const [k, v] of Object.entries(company.data as Record<string, unknown>)) {
        const t = normalizeType(k);
        if (!t) continue;
        if (!v || typeof v !== "object") continue;
        out.push(normalizeEntry(v as Record<string, unknown>, cid, cname, t));
      }
    }
  };

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;

      // Company-grouped payload
      if ("company_id" in obj && ("totals" in obj || "cashup" in obj || "cashin" in obj || "cashups" in obj || "cashins" in obj)) {
        visitCompanyBlock(obj);
        continue;
      }

      // Flat entry payload
      const cid = toNumber(obj.company_id ?? obj.companyId);
      const t = normalizeType(obj.type ?? obj.cash_type ?? obj.cashup_type);
      if (cid !== null && t && allowedCompanyIds.has(cid)) {
        const cname = (typeof obj.company_name === "string" && obj.company_name.trim()) || fallbackCompanyName(cid);
        out.push(normalizeEntry(obj, cid, cname, t));
      }
    }
    return out.filter(Boolean);
  }

  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return extractEntries(o.data, allowedCompanyIds, fallbackCompanyName);

    // Single flat entry payload nested in objects.
    const cid = toNumber(o.company_id ?? o.companyId);
    const t = normalizeType(o.type ?? o.cash_type ?? o.cashup_type);
    if (cid !== null && t && allowedCompanyIds.has(cid)) {
      const cname = (typeof o.company_name === "string" && o.company_name.trim()) || fallbackCompanyName(cid);
      out.push(normalizeEntry(o, cid, cname, t));
      return out.filter(Boolean);
    }

    // Numeric-keyed company map: { "197": { data: {CashIn: {...}, CashUp: {...}} } }
    const numericKeys = Object.keys(o).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length) {
      for (const k of numericKeys) {
        const cidKey = Number(k);
        if (!Number.isFinite(cidKey) || !allowedCompanyIds.has(cidKey)) continue;
        const block = o[k];
        if (!block || typeof block !== "object") continue;
        visitCompanyBlock({ company_id: cidKey, company_name: fallbackCompanyName(cidKey), ...(block as Record<string, unknown>) });
      }
      if (out.length) return out.filter(Boolean);
    }

    for (const v of Object.values(o)) {
      const extracted = extractEntries(v, allowedCompanyIds, fallbackCompanyName);
      if (extracted.length) out.push(...extracted);
    }
  }

  return out.filter(Boolean);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const companies = companiesFromAuth0User(session.user);
  const allowedIds = new Set(companies.map((c) => c.id));
  const nameById = new Map(companies.map((c) => [c.id, c.name ?? `Company ${c.id}`]));

  const url = new URL(request.url);
  const date = url.searchParams.get("date")?.trim();
  if (!date) return NextResponse.json({ success: false, error: "Missing date" }, { status: 400 });

  if (!allowedIds.size) {
    return NextResponse.json({ success: true, date, assignedCompanyCount: 0, entriesByCompany: {} });
  }

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-cashup.php`);
  upstreamUrl.searchParams.set("date", date);

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) {
    return NextResponse.json({ success: false, error: "Upstream error" }, { status: 502 });
  }

  const entries = extractEntries(json.data, allowedIds, (id) => nameById.get(id) ?? `Company ${id}`);

  const byCompany: Record<string, { cashin?: CashupEntry; cashup?: CashupEntry; all: CashupEntry[] }> = {};
  for (const e of entries) {
    const key = String(e.company_id);
    if (!byCompany[key]) byCompany[key] = { all: [] };
    byCompany[key].all.push(e);
  }

  // Pick latest per type (created_at if present, otherwise last occurrence).
  for (const [cid, bucket] of Object.entries(byCompany)) {
    const sortKey = (e: CashupEntry) => (e.created_at ? new Date(e.created_at).getTime() : 0);
    const cashin = bucket.all.filter((e) => e.type === "cashin").sort((a, b) => sortKey(b) - sortKey(a))[0];
    const cashup = bucket.all.filter((e) => e.type === "cashup").sort((a, b) => sortKey(b) - sortKey(a))[0];
    byCompany[cid].cashin = cashin;
    byCompany[cid].cashup = cashup;
  }

  return NextResponse.json(
    { success: true, date, assignedCompanyCount: allowedIds.size, entriesByCompany: byCompany },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}
