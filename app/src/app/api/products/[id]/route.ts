import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";
import { config } from "@/lib/config";

type UpstreamProductResponse = {
  success: boolean;
  data?: Array<Record<string, unknown>>;
  error?: string;
};

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const allowedIds = new Set(companiesFromAuth0User(session.user).map((c) => c.id));
  if (!allowedIds.size) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-product.php`);
  upstreamUrl.searchParams.set("id", String(id));

  const upstream = await fetch(upstreamUrl, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" });
  const json = (await upstream.json().catch(() => null)) as UpstreamProductResponse | null;
  if (!upstream.ok || !json?.success) {
    return NextResponse.json({ success: false, error: json?.error ?? "Upstream error" }, { status: 502 });
  }

  const product = (Array.isArray(json.data) ? json.data[0] : null) as Record<string, unknown> | null;
  if (!product) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const companyId = toNumber(product["company_id"]);
  if (companyId === null || !allowedIds.has(companyId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(
    { success: true, data: product },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=120" } }
  );
}

