import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));
  const assignedCompanyCount = allowedIds.size;

  const url = new URL(request.url);
  const dateFrom = (url.searchParams.get("date_from") ?? "").trim();
  const dateTo = (url.searchParams.get("date_to") ?? "").trim();
  const limitRaw = (url.searchParams.get("limit") ?? "100").trim();
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const employeeIdRaw = (url.searchParams.get("employee_id") ?? "").trim();
  const limit = String(Math.max(0, Number(limitRaw) || 0));

  if (!dateFrom || !dateTo) return NextResponse.json({ success: false, error: "Missing date_from/date_to" }, { status: 400 });
  if (!assignedCompanyCount) {
    return NextResponse.json({ success: true, assignedCompanyCount: 0, companies: [], data: [] });
  }

  if (companyIdRaw) {
    const cid = Number(companyIdRaw);
    if (!Number.isFinite(cid) || !allowedIds.has(cid)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  if (employeeIdRaw) {
    const eid = Number(employeeIdRaw);
    if (!Number.isFinite(eid) || eid <= 0) return NextResponse.json({ success: false, error: "Invalid employee_id" }, { status: 400 });
  }

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-inventory-logs.php`);
  upstreamUrl.searchParams.set("date_from", dateFrom);
  upstreamUrl.searchParams.set("date_to", dateTo);
  upstreamUrl.searchParams.set("limit", limit);
  if (companyIdRaw) upstreamUrl.searchParams.set("company_id", companyIdRaw);
  if (employeeIdRaw) upstreamUrl.searchParams.set("employee_id", employeeIdRaw);

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });

  const rows = Array.isArray(json.data) ? (json.data as any[]) : [];
  const filtered = rows.filter((r) => {
    const cid = toNumber(r?.company_id ?? r?.companyId);
    if (cid === null) return true; // if upstream doesn't include, rely on server-side company_id param
    return allowedIds.has(cid);
  });

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      filters_used: {
        date_from: dateFrom,
        date_to: dateTo,
        limit: Number(limit),
        company_id: companyIdRaw ? Number(companyIdRaw) : null,
        employee_id: employeeIdRaw ? Number(employeeIdRaw) : null
      },
      data: filtered
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}
