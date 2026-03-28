import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type Payload = { action?: "save" | "delete"; token?: string };

export async function POST(req: Request) {
  const session = await getSession();
  const user = session?.user ?? null;
  if (!user) return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });

  let body: Payload = {};
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action === "delete" ? "delete" : "save";
  const token = typeof body.token === "string" ? body.token.trim() : "";

  const userId = String((user as any).email ?? (user as any).sub ?? "").trim();
  if (!userId) return NextResponse.json({ success: false, error: "Missing user id" }, { status: 400 });

  const companies = companiesFromAuth0User(user);
  const company_ids = companies.map((c) => c.id).filter((id) => Number.isFinite(id));

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://apps.dashify.com.au/milo/api";
  const url = `${apiBaseUrl.replace(/\/$/, "")}/save-token.php`;

  const upstreamPayload: any = { action, name: userId, company_ids };
  if (token) upstreamPayload.token = token;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamPayload),
      // This should never be cached; token rotation is time-sensitive.
      cache: "no-store",
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message ? String(e.message) : "Upstream fetch failed" }, { status: 502 });
  }

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `Upstream error (${res.status})`, upstream: json ?? text ?? null },
      { status: 502 }
    );
  }

  if (!text) {
    return NextResponse.json(
      { success: false, error: "Upstream returned an empty response body", upstream_status: res.status, company_ids },
      { status: 502 }
    );
  }

  if (!json || typeof json !== "object") {
    return NextResponse.json(
      { success: false, error: "Upstream returned non-JSON response", upstream_status: res.status, upstream: text, company_ids },
      { status: 502 }
    );
  }

  if (json.success === false) {
    return NextResponse.json(
      { success: false, error: "Upstream reported failure", upstream_status: res.status, upstream: json, company_ids },
      { status: 502 }
    );
  }

  // Pass through upstream response (and include our computed company_ids for debugging).
  return NextResponse.json({ ...json, company_ids }, { status: 200 });
}
