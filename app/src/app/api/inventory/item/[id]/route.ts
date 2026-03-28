import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamResponse = { success: boolean; data?: any[]; error?: string };

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

export async function GET(_request: Request, ctx: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const access = companiesFromAuth0User(session.user);
  const allowedIds = new Set(access.map((c) => c.id));

  const id = String(ctx.params.id ?? "").trim();
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-inventory.php`);
  upstreamUrl.searchParams.set("id", id);

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });

  const item = Array.isArray(json.data) && json.data.length ? json.data[0] : null;
  if (!item) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const companyId = toNumber(item.company_id ?? item.companyId);
  if (companyId === null) return NextResponse.json({ success: false, error: "Missing company_id" }, { status: 502 });
  if (!allowedIds.has(companyId)) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  return NextResponse.json(
    {
      success: true,
      item
    },
    { headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" } }
  );
}

