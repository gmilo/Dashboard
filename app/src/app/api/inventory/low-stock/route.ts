import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamResponse = {
  status?: boolean;
  data?: { items?: unknown[] };
  error?: string;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = access.map((c) => c.id);
  const assignedCompanyCount = allowedIds.length;

  if (!assignedCompanyCount) return NextResponse.json({ success: true, assignedCompanyCount: 0, companies: [], company_id: null, data: [] });

  const url = new URL(request.url);
  const companyIdRaw = (url.searchParams.get("company_id") ?? "").trim();
  const companyId = companyIdRaw ? Number(companyIdRaw) : allowedIds[0]!;
  if (!Number.isFinite(companyId) || !new Set(allowedIds).has(companyId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const upstreamUrl = new URL(`${config.ajaxBaseUrl}/inventory.php`);
  upstreamUrl.searchParams.set("action", "get_inventory");
  upstreamUrl.searchParams.set("company_id", String(companyId));

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.status) return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });

  const items = Array.isArray(json?.data?.items) ? (json!.data!.items as unknown[]) : [];

  return NextResponse.json(
    {
      success: true,
      assignedCompanyCount,
      companies: access.map((c) => ({ id: c.id, name: c.name ?? `Company ${c.id}` })),
      company_id: companyId,
      data: items
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

