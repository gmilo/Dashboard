import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { config } from "@/lib/config";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type UpstreamRow = {
  product_id: number | string;
  item: string;
  qty: number | string;
  avg: string | number;
  price: string | number;
};

type UpstreamResponse = {
  success: boolean;
  data?: UpstreamRow[];
  totals?: { total_qty?: number | string; total_price?: string | number };
  error?: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const limitRaw = (url.searchParams.get("limit") ?? "0").trim();
  const limit = String(Math.max(0, Number(limitRaw) || 0));

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ success: false, error: "Missing date_from/date_to" }, { status: 400 });
  }

  if (!assignedCompanyCount) {
    return NextResponse.json({
      success: true,
      assignedCompanyCount: 0,
      companies: [],
      totals: { total_qty: 0, total_price: 0 },
      data: []
    });
  }

  const requestedCompanyId = companyIdRaw ? Number(companyIdRaw) : null;
  if (companyIdRaw && (!Number.isFinite(requestedCompanyId!) || !allowedIds.has(requestedCompanyId!))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const companiesToFetch = requestedCompanyId ? access.filter((c) => c.id === requestedCompanyId) : access;

  const results = await Promise.all(
    companiesToFetch.map(async (c) => {
      const upstreamUrl = new URL(`${config.dataBaseUrl}/toppings.php`);
      upstreamUrl.searchParams.set("company_id", String(c.id));
      upstreamUrl.searchParams.set("date_from", dateFrom);
      upstreamUrl.searchParams.set("date_to", dateTo);
      upstreamUrl.searchParams.set("limit", limit);

      const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
      const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
      if (!upstream.ok || !json?.success) return { company: c, rows: [] as any[], totals: { qty: 0, price: 0 } };

      const rows = Array.isArray(json.data) ? json.data : [];
      const mapped = rows.map((r) => ({
        company_id: c.id,
        company: c.name ?? `Company ${c.id}`,
        product_id: r.product_id,
        item: r.item,
        qty: toNumber(r.qty),
        avg: toNumber(r.avg),
        price: toNumber(r.price)
      }));
      return {
        company: c,
        rows: mapped,
        totals: {
          qty: toNumber(json.totals?.total_qty),
          price: toNumber(json.totals?.total_price)
        }
      };
    })
  );

  const flat = results.flatMap((r) => r.rows);
  flat.sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));

  const totals = results.reduce(
    (acc, r) => ({ total_qty: acc.total_qty + r.totals.qty, total_price: acc.total_price + r.totals.price }),
    { total_qty: 0, total_price: 0 }
  );

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      totals,
      data: flat
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

