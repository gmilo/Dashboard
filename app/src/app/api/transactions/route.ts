import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { config } from "@/lib/config";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type TransactionItem = {
  id?: number;
  product_id?: number | string;
  sku?: string;
  parent_id?: string | number | null;
  variation?: string | null;
  item_name?: string;
  category_id?: number | string | null;
  tag?: string | null;
  quantity?: number | string;
  unit_price?: number | string;
  external_id?: string | number | null;
  category_name?: string | null;
  status?: string | null;
  children?: TransactionItem[];
};

type TransactionSale = {
  id: number;
  company_id: number;
  company_name?: string | null;
  sale_date?: string;
  source?: string | null;
  external_reference?: string | null;
  status?: string | null;
  total_amount?: string | number | null;
  discount?: string | number | null;
  final_amount?: string | number | null;
  payment_type?: string | null;
  type?: string | null;
  refunded_amount?: string | number | null;
  refunded_method?: string | null;
  member?: Record<string, unknown> | null;
};

type UpstreamResponse = {
  success: boolean;
  filters_used?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  data?: Array<{ sale: TransactionSale; items: TransactionItem[] }>;
  error?: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function inc(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

function collectMeta(transactions: Array<{ sale: TransactionSale; items: TransactionItem[] }>) {
  const payment_types: Record<string, number> = {};
  const types: Record<string, number> = {};
  const tags: Record<string, number> = {};
  const categories: Record<string, number> = {};
  const status: Record<string, number> = {};

  for (const t of transactions) {
    inc(payment_types, t.sale.payment_type ?? null);
    inc(types, t.sale.type ?? null);
    inc(status, t.sale.status ?? null);

    const stack: TransactionItem[] = [...(t.items ?? [])];
    while (stack.length) {
      const item = stack.pop()!;
      if (item.tag) inc(tags, item.tag);
      if (item.category_name) inc(categories, item.category_name);
      if (Array.isArray(item.children)) stack.push(...item.children);
    }
  }

  return { payment_types, types, tags, categories, status };
}

function buildSummary(transactions: Array<{ sale: TransactionSale }>) {
  const byCompany: Record<
    string,
    { company_id: number; company_name?: string | null; count: number; total_amount: number; discount: number; final_amount: number }
  > = {};

  for (const t of transactions) {
    const cid = t.sale.company_id;
    const key = String(cid);
    if (!byCompany[key]) {
      byCompany[key] = {
        company_id: cid,
        company_name: t.sale.company_name ?? null,
        count: 0,
        total_amount: 0,
        discount: 0,
        final_amount: 0
      };
    }
    byCompany[key].count += 1;
    byCompany[key].total_amount += toNumber(t.sale.total_amount);
    byCompany[key].discount += toNumber(t.sale.discount);
    byCompany[key].final_amount += toNumber(t.sale.final_amount);
  }

  return byCompany;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));
  const assignedCompanyCount = allowedIds.size;

  const url = new URL(request.url);
  const dateRaw = url.searchParams.get("date")?.trim() ?? "";
  let dateFrom = url.searchParams.get("date_from")?.trim() ?? "";
  let dateTo = url.searchParams.get("date_to")?.trim() ?? "";
  const discount = url.searchParams.get("discount")?.trim() ?? "";
  const statusFilter = (url.searchParams.get("status") ?? "").trim().toLowerCase();
  const paymentTypeFilterRaw = (url.searchParams.get("payment_type") ?? "").trim();
  const memberIdRaw = (url.searchParams.get("member_id") ?? "").trim();
  const productIdRaw = (url.searchParams.get("product_id") ?? "").trim();
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const limitRaw = (url.searchParams.get("limit") ?? "0").trim();
  const limit = String(Math.max(0, Number(limitRaw) || 0));

  if ((!dateFrom || !dateTo) && dateRaw) {
    dateFrom = dateRaw;
    dateTo = dateRaw;
  }

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ success: false, error: "Missing date_from/date_to" }, { status: 400 });
  }

  if (!assignedCompanyCount) {
    return NextResponse.json({
      success: true,
      assignedCompanyCount: 0,
      companies: [],
      filters_used: { date_from: dateFrom, date_to: dateTo, company_id: null, discount: null, status: null, limit: Number(limit) },
      meta: { payment_types: {}, types: {}, tags: {}, categories: {}, status: {} },
      summary: {},
      data: []
    });
  }

  const upstreamUrl = new URL(`${config.dataBaseUrl}/transactions.php`);
  upstreamUrl.searchParams.set("date_from", dateFrom);
  upstreamUrl.searchParams.set("date_to", dateTo);
  upstreamUrl.searchParams.set("limit", limit);
  // NOTE: do NOT forward `status` to upstream because that endpoint disables date filtering when status is set.
  if (discount === "1" || discount.toLowerCase() === "true") upstreamUrl.searchParams.set("discount", "1");
  if (productIdRaw) upstreamUrl.searchParams.set("product_id", productIdRaw);
  if (memberIdRaw) upstreamUrl.searchParams.set("member_id", memberIdRaw);

  if (companyIdRaw) {
    const requestedCompanyId = Number(companyIdRaw);
    if (!Number.isFinite(requestedCompanyId) || !allowedIds.has(requestedCompanyId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    upstreamUrl.searchParams.set("company_id", String(requestedCompanyId));
  }

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) {
    return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });
  }

  const upstreamRows = Array.isArray(json.data) ? json.data : [];

  let filtered = upstreamRows.filter((t) => allowedIds.has(Number(t.sale.company_id)));

  if (statusFilter === "completed") {
    filtered = filtered.filter((t) => (t.sale.status ?? "").toLowerCase() === "completed");
  } else if (statusFilter) {
    // Any other non-empty status filter means "not completed".
    filtered = filtered.filter((t) => (t.sale.status ?? "").toLowerCase() !== "completed");
  }

  // Meta should reflect current scope (date/company/discount/status), but not be constrained by payment_type so the UI can still show options.
  const meta = collectMeta(filtered);

  const paymentTypeFilter = paymentTypeFilterRaw.toLowerCase();
  if (paymentTypeFilter) {
    filtered = filtered.filter((t) => String(t.sale.payment_type ?? "").toLowerCase() === paymentTypeFilter);
  }

  const summary = buildSummary(filtered);

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      filters_used: {
        date_from: dateFrom,
        date_to: dateTo,
        date: dateRaw || null,
        company_id: companyIdRaw ? Number(companyIdRaw) : null,
        discount: discount === "1" || discount.toLowerCase() === "true" ? 1 : null,
        status: statusFilter || null,
        payment_type: paymentTypeFilterRaw || null,
        member_id: memberIdRaw || null,
        product_id: productIdRaw || null,
        limit: Number(limit)
      },
      meta,
      summary,
      data: filtered
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}
