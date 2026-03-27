import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");
  if (companyId) {
    const allowed = new Set(companiesFromAuth0User(session.user).map((c) => c.id));
    const requested = Number(companyId);
    if (!allowed.has(requested)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const target = new URL(`${config.dataBaseUrl}/${params.path.join("/")}`);
  target.search = url.search;

  const upstream = await fetch(target, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      // Small edge/browser cache + allow SWR to revalidate in background.
      "Cache-Control": "public, max-age=15, stale-while-revalidate=60"
    }
  });
}
