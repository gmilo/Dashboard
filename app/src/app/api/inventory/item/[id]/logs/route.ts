import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamResponse = { success: boolean; data?: unknown; error?: string };

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

async function fetchInventoryItem(id: string) {
  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-inventory.php`);
  upstreamUrl.searchParams.set("id", id);
  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as { success: boolean; data?: any[] } | null;
  if (!upstream.ok || !json?.success) return null;
  return Array.isArray(json.data) && json.data.length ? json.data[0] : null;
}

export async function GET(request: Request, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));

  const id = String(ctx.params.id ?? "").trim();
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  const url = new URL(request.url);
  const dateFrom = (url.searchParams.get("date_from") ?? "").trim();
  const dateTo = (url.searchParams.get("date_to") ?? "").trim();
  const limitRaw = (url.searchParams.get("limit") ?? "10").trim();
  const limit = String(Math.max(0, Number(limitRaw) || 0));

  if (!dateFrom || !dateTo) return NextResponse.json({ success: false, error: "Missing date_from/date_to" }, { status: 400 });

  const item = await fetchInventoryItem(id);
  if (!item) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const companyId = toNumber(item.company_id ?? item.companyId);
  if (companyId === null) return NextResponse.json({ success: false, error: "Missing company_id" }, { status: 502 });
  if (!allowedIds.has(companyId)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-inventory-logs.php`);
  upstreamUrl.searchParams.set("date_from", dateFrom);
  upstreamUrl.searchParams.set("date_to", dateTo);
  upstreamUrl.searchParams.set("limit", limit);
  upstreamUrl.searchParams.set("inventory_id", id);
  upstreamUrl.searchParams.set("id", id);
  upstreamUrl.searchParams.set("search", "false");
  upstreamUrl.searchParams.set("company_id", String(companyId));

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });

  const rows = Array.isArray(json.data) ? (json.data as any[]) : [];
  const filtered = rows.filter((r) => {
    const cid = toNumber(r?.company_id ?? r?.companyId);
    if (cid === null) return true;
    return allowedIds.has(cid);
  });

  return NextResponse.json(
    { success: true, company_id: companyId, inventory_id: Number(id) || id, date_from: dateFrom, date_to: dateTo, data: filtered },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

