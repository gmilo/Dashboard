import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type InventoryItem = Record<string, any>;
type UpstreamResponse = Record<string, { children?: InventoryItem[] }>;

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function flattenItems(data: UpstreamResponse): InventoryItem[] {
  const out: InventoryItem[] = [];
  for (const v of Object.values(data ?? {})) {
    if (v?.children && Array.isArray(v.children)) out.push(...v.children);
  }
  return out;
}

function parseLastValidatedAt(item: InventoryItem): Date | null {
  const batches = Array.isArray(item.stock_batch) ? item.stock_batch : [];
  const defaultId = item.default_active_stock_batch_id;
  const defaultBatch = batches.find((b: any) => b?.id === defaultId) ?? batches[0];
  const s = defaultBatch?.last_validated_at;
  if (!s || typeof s !== "string") return null;
  const dt = new Date(s);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = access.map((c) => c.id);
  const assignedCompanyCount = allowedIds.length;
  if (!assignedCompanyCount) return NextResponse.json({ success: true, assignedCompanyCount: 0, companies: [], company_id: null, data: [] });

  const url = new URL(request.url);
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const date = (url.searchParams.get("date") ?? "").trim();
  const limitRaw = (url.searchParams.get("limit") ?? "0").trim();
  const companyId = companyIdRaw ? Number(companyIdRaw) : allowedIds[0]!;
  if (!Number.isFinite(companyId) || !new Set(allowedIds).has(companyId)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const upstreamUrl = new URL(`${config.publicApiBaseUrl}/api/v1/public/companies/${companyId}/inventory`);
  upstreamUrl.searchParams.set("type", "General");
  upstreamUrl.searchParams.set("include_pending_quantity", "true");
  upstreamUrl.searchParams.set("company_id", String(companyId));
  if (date) upstreamUrl.searchParams.set("date", date);
  upstreamUrl.searchParams.set("limit", String(Math.max(0, Number(limitRaw) || 0)));

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json) return NextResponse.json({ success: false, error: "Upstream error" }, { status: 502 });

  const all = flattenItems(json);
  const now = new Date();

  const rows = all
    .map((item) => {
      const validationDays = toNumber(item?.stock_meta_data?.validation_days);
      if (validationDays <= 0) return null;

      let stockQty = toNumber(item.quantity);
      if (Array.isArray(item.stock_batch) && item.stock_batch.length) {
        stockQty = item.stock_batch.reduce((t: number, b: any) => t + toNumber(b?.quantity), 0);
      }

      const lastValidated = parseLastValidatedAt(item);
      const diffDays = lastValidated ? Math.floor((now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const required = !lastValidated || (diffDays !== null && diffDays > validationDays);

      const validatedBy =
        item.stock_batch?.find((b: any) => b?.id === item.default_active_stock_batch_id)?.last_validated_by_employee?.[0]?.display_name ??
        item.stock_batch?.[0]?.last_validated_by_employee?.[0]?.display_name ??
        null;

      return {
        id: item.id ?? null,
        name: item.name ?? "",
        name_sub: item.name_sub ?? "",
        image: item.image ?? "",
        stock_qty: stockQty,
        validation_days: validationDays,
        last_validated_at: lastValidated ? lastValidated.toISOString() : null,
        validated_by: validatedBy,
        required
      };
    })
    .filter(Boolean);

  rows.sort((a: any, b: any) => Number(b.required) - Number(a.required) || (b.stock_qty ?? 0) - (a.stock_qty ?? 0));

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      company_id: companyId,
      date: date || null,
      data: rows
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

