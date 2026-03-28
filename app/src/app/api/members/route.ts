import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type MemberRow = Record<string, unknown> & {
  id?: number | string;
  company_id?: number | string;
  company_name?: string;
  store_id?: number | string;
  store_name?: string;
};

type UpstreamResponse = {
  success: boolean;
  filters_used?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  data?: unknown;
  members?: unknown;
  error?: string;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = typeof value === "number" ? value : Number(String(value));
  return Number.isFinite(n) ? n : null;
}

function unwrapUpstreamData(value: unknown): unknown {
  // Some endpoints wrap a `{success, data}` object inside `data`.
  let cur = value;
  for (let i = 0; i < 3; i++) {
    if (!cur || typeof cur !== "object") break;
    const obj = cur as Record<string, unknown>;
    if (typeof obj.success === "boolean" && "data" in obj) {
      cur = obj.data;
      continue;
    }
    break;
  }
  return cur;
}

function companyIdFromRow(row: MemberRow, fallbackCompanyId: number | null): number | null {
  const direct = toNumber(row.company_id);
  if (direct !== null) return direct;
  const store = toNumber(row.store_id);
  if (store !== null) return store;
  const camel = toNumber((row as Record<string, unknown>)["companyId"]);
  if (camel !== null) return camel;
  return fallbackCompanyId;
}

function extractMemberRows(value: unknown): MemberRow[] {
  const v = unwrapUpstreamData(value);

  if (Array.isArray(v)) {
    // Common: array of member objects
    if (v.every((x) => x && typeof x === "object" && !Array.isArray(x))) return v as MemberRow[];

    // Grouped shape: [companyName, [...rows]] or similar
    const out: MemberRow[] = [];
    for (const item of v) {
      if (Array.isArray(item) && item.length >= 2 && Array.isArray(item[1])) {
        for (const r of item[1] as unknown[]) if (r && typeof r === "object" && !Array.isArray(r)) out.push(r as MemberRow);
      }
    }
    return out;
  }

  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    // Common: { data: [...] }
    if (Array.isArray(obj.data)) return obj.data.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as MemberRow[];
    if (Array.isArray(obj.rows)) return obj.rows.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as MemberRow[];
    if (Array.isArray(obj.members)) return obj.members.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as MemberRow[];

    // Object map of arrays: { "197": [...], "263": [...] }
    const out: MemberRow[] = [];
    for (const val of Object.values(obj)) {
      if (!Array.isArray(val)) continue;
      for (const r of val) if (r && typeof r === "object" && !Array.isArray(r)) out.push(r as MemberRow);
    }
    return out;
  }

  return [];
}

function normalizeRows(rows: MemberRow[], fallbackCompanyId: number | null): MemberRow[] {
  return rows.map((r) => {
    const cid = companyIdFromRow(r, fallbackCompanyId);
    if (cid === null) return r;
    const next: MemberRow = { ...r };
    if (next.company_id === undefined) next.company_id = cid;
    if (next.company_name === undefined && typeof next.store_name === "string" && next.store_name.trim()) {
      next.company_name = next.store_name.trim();
    }
    return next;
  });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));
  const assignedCompanyCount = allowedIds.size;

  const url = new URL(request.url);
  const idRaw = url.searchParams.get("id")?.trim() ?? "";
  const companyIdRaw = url.searchParams.get("company_id")?.trim() ?? "";
  const debug = (url.searchParams.get("debug") ?? "").trim() === "1";

  if (!assignedCompanyCount) {
    return NextResponse.json({
      success: true,
      assignedCompanyCount: 0,
      companies: [],
      filters_used: { id: idRaw ? Number(idRaw) || idRaw : null, company_id: companyIdRaw ? Number(companyIdRaw) || companyIdRaw : null },
      data: idRaw ? null : []
    });
  }

  const upstreamBase = new URL(`${config.dataBaseUrl}/members.php`);

  // Single member lookup (verify access after fetch).
  if (idRaw) {
    upstreamBase.searchParams.set("id", idRaw);
    const upstream = await fetch(upstreamBase, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
    if (!upstream.ok || !json?.success) {
      return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });
    }

    const payload = json.data ?? json.members ?? (json as unknown);
    const raw = unwrapUpstreamData(payload);
    const member =
      (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as MemberRow) : null) ?? (extractMemberRows(payload)[0] ?? null);
    const normalized = member ? normalizeRows([member], null)[0] : null;
    const memberCompanyId = normalized ? companyIdFromRow(normalized, null) : null;
    if (memberCompanyId !== null && !allowedIds.has(memberCompanyId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      {
        success: true,
        assignedCompanyCount,
        companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
        filters_used: { id: idRaw, company_id: null },
        data: normalized
      },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
    );
  }

  // List members.
  if (companyIdRaw) {
    const requestedCompanyId = Number(companyIdRaw);
    if (!Number.isFinite(requestedCompanyId) || !allowedIds.has(requestedCompanyId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const u = new URL(upstreamBase.toString());
    u.searchParams.set("company_id", String(requestedCompanyId));
    const upstream = await fetch(u, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
    if (!upstream.ok || !json?.success) {
      return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });
    }

    const payload = json.data ?? json.members ?? (json as unknown);
    const extracted = extractMemberRows(payload);
    const rows = normalizeRows(extracted, requestedCompanyId);
    const filtered = rows.filter((m) => allowedIds.has(companyIdFromRow(m, requestedCompanyId) ?? requestedCompanyId));

    const debugInfo = debug
      ? {
          upstreamKeys: json && typeof json === "object" ? Object.keys(json as Record<string, unknown>) : [],
          extractedCount: extracted.length,
          normalizedCount: rows.length,
          filteredCount: filtered.length,
          sample: filtered[0]
            ? {
                id: filtered[0].id ?? null,
                store_id: (filtered[0] as Record<string, unknown>).store_id ?? null,
                company_id: filtered[0].company_id ?? null,
                store_name: (filtered[0] as Record<string, unknown>).store_name ?? null,
                company_name: filtered[0].company_name ?? null
              }
            : null
        }
      : undefined;

    return NextResponse.json(
      {
        success: true,
        assignedCompanyCount,
        companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
        filters_used: { id: null, company_id: requestedCompanyId },
        data: filtered,
        debug: debugInfo
      },
      { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
    );
  }

  // No company specified: fetch per allowed company and merge.
  const merged: MemberRow[] = [];
  const seen = new Set<string>();

  for (const company of access) {
    const u = new URL(upstreamBase.toString());
    u.searchParams.set("company_id", String(company.id));
    const upstream = await fetch(u, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
    const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
    if (!upstream.ok || !json?.success) continue;

    const payload = json.data ?? json.members ?? (json as unknown);
    const rows = normalizeRows(extractMemberRows(payload), company.id);
    for (const m of rows) {
      const cid = companyIdFromRow(m, company.id);
      if (cid === null || !allowedIds.has(cid)) continue;
      const id = m.id ?? "";
      const key = `${cid}:${String(id)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(m);
    }
  }

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      filters_used: { id: null, company_id: null },
      data: merged
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}
