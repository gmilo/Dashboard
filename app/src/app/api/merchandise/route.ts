import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type Row = {
  company?: string;
  company_id?: number | string;
  product_id?: number | string;
  item_name?: string;
  category?: string;
  tag?: string;
  avg?: number;
  qty?: number;
  amount?: number;
};

type UpstreamResponse = {
  success: boolean;
  filters_used?: Record<string, unknown>;
  meta?: { tags?: Record<string, number> | Array<unknown>; categories?: Record<string, number> | Array<unknown> };
  data?: Row[];
  error?: string;
};

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

function buildMeta(rows: Row[]) {
  const tags: Record<string, number> = {};
  const categories: Record<string, number> = {};
  for (const r of rows) {
    const tag = typeof r.tag === "string" ? r.tag : "";
    if (tag) tags[tag] = (tags[tag] ?? 0) + 1;
    const category = typeof r.category === "string" ? r.category : "";
    if (category) categories[category] = (categories[category] ?? 0) + 1;
  }
  return { tags, categories };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));
  const assignedCompanyCount = allowedIds.size;

  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("date_from")?.trim() ?? "";
  const dateTo = url.searchParams.get("date_to")?.trim() ?? "";
  const tag = url.searchParams.get("tag")?.trim() ?? "";
  const discount = url.searchParams.get("discount")?.trim() ?? "";
  const companyIdRaw = url.searchParams.get("company_id")?.trim() ?? "";
  const limitRaw = url.searchParams.get("limit")?.trim() ?? "0";
  const limit = String(Math.max(0, Number(limitRaw) || 0));

  if (!dateFrom || !dateTo) return NextResponse.json({ success: false, error: "Missing date_from/date_to" }, { status: 400 });

  if (!assignedCompanyCount) {
    return NextResponse.json({ success: true, assignedCompanyCount: 0, companies: [], data: [], meta: { tags: {}, categories: {} } });
  }

  const upstreamUrl = new URL(`${config.dataBaseUrl}/merchandise.php`);
  upstreamUrl.searchParams.set("date_from", dateFrom);
  upstreamUrl.searchParams.set("date_to", dateTo);
  upstreamUrl.searchParams.set("limit", limit);
  if (companyIdRaw) {
    const requestedCompanyId = Number(companyIdRaw);
    if (!Number.isFinite(requestedCompanyId) || !allowedIds.has(requestedCompanyId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    upstreamUrl.searchParams.set("company_id", String(requestedCompanyId));
  }
  if (tag) upstreamUrl.searchParams.set("tag", tag);
  if (discount === "1" || discount.toLowerCase() === "true") upstreamUrl.searchParams.set("discount", "1");

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });

  const rows = Array.isArray(json.data) ? json.data : [];
  const filtered = rows.filter((r) => {
    const id = toNumber(r.company_id);
    return id !== null && allowedIds.has(id);
  });

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      filters_used: {
        company_id: companyIdRaw ? Number(companyIdRaw) : null,
        date_from: dateFrom,
        date_to: dateTo,
        tag: tag || null,
        discount: discount === "1" || discount.toLowerCase() === "true" ? 1 : null,
        limit: Number(limit)
      },
      meta: buildMeta(filtered),
      data: filtered
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

