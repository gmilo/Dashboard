import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamProductResponse = {
  success: boolean;
  data?: Array<Record<string, unknown>>;
};

type UpstreamSalesResponse = {
  success: boolean;
  summary?: Record<string, unknown>;
  data?: Array<Record<string, unknown>>;
  error?: string;
};

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

async function assertProductAccess(id: number, allowedCompanyIds: Set<number>) {
  const productUrl = new URL(`${config.dataBaseUrl}/dashify-product.php`);
  productUrl.searchParams.set("id", String(id));
  const upstream = await fetch(productUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamProductResponse | null;
  const product = (json?.success && Array.isArray(json.data) ? json.data[0] : null) as Record<string, unknown> | null;
  const companyId = product ? toNumber(product["company_id"]) : null;
  if (companyId === null || !allowedCompanyIds.has(companyId)) return false;
  return true;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const allowedIds = new Set(companiesFromAuth0User(session.user).map((c) => c.id));
  if (!allowedIds.size) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const url = new URL(request.url);
  const groupBy = (url.searchParams.get("group_by") ?? "day").toLowerCase();
  const safeGroupBy = groupBy === "week" || groupBy === "month" ? groupBy : "day";

  const hasAccess = await assertProductAccess(id, allowedIds);
  if (!hasAccess) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-product-sales.php`);
  upstreamUrl.searchParams.set("id", String(id));
  upstreamUrl.searchParams.set("group_by", safeGroupBy);

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamSalesResponse | null;
  if (!upstream.ok || !json?.success) {
    return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });
  }

  return NextResponse.json(
    { success: true, group_by: safeGroupBy, summary: json.summary ?? null, data: json.data ?? [] },
    { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" } }
  );
}

