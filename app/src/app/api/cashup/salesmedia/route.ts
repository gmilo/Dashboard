import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { config } from "@/lib/config";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type UpstreamResponse = {
  success: boolean;
  data?: {
    success?: boolean;
    data?: Array<[string, unknown]>;
    axis?: string[];
  };
  error?: unknown;
  date?: string;
};

function normalizeStoreName(name: string) {
  return name.trim().toLowerCase();
}

function parseMoney(input: unknown): number {
  if (typeof input === "number") return input;
  const s = String(input ?? "");
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const companies = companiesFromAuth0User(session.user);
  const allowedNames = new Set(companies.map((c) => normalizeStoreName(c.name ?? "")));

  const url = new URL(request.url);
  const dateTo = url.searchParams.get("date_to")?.trim();
  if (!dateTo) {
    return NextResponse.json({ success: false, error: "Missing date_to" }, { status: 400 });
  }

  // If the user has no assigned companies, short-circuit.
  if (!allowedNames.size) {
    return NextResponse.json({ success: true, date: dateTo, assignedCompanyCount: 0, stores: [] });
  }

  const upstreamUrl = new URL(`${config.ajaxBaseUrl}/scraper/redcat_sales.php`);
  upstreamUrl.searchParams.set("report", "salesmedia");
  upstreamUrl.searchParams.set("date_to", dateTo);

  const upstream = await fetch(upstreamUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  const json = (await upstream.json().catch(() => null)) as UpstreamResponse | null;
  if (!upstream.ok || !json?.success) {
    return NextResponse.json({ success: false, error: "Upstream error" }, { status: 502 });
  }

  const storeBlocks = (json.data?.data ?? []) as Array<[string, unknown]>;

  const stores = storeBlocks
    .map(([storeName, groups]) => {
      const normalized = normalizeStoreName(storeName);
      if (!allowedNames.has(normalized)) return null;

      // Expected shape:
      // [storeName, [ [groupName, [ [method, amount, count], ... ] ] ] ]
      const firstGroup = Array.isArray(groups) ? (groups as unknown[])[0] : null;
      const rowsContainer = Array.isArray(firstGroup) ? (firstGroup as unknown[])[1] : null;
      const rows = Array.isArray(rowsContainer) ? (rowsContainer as unknown[]) : [];

      const parsedRows = rows
        .filter((r) => Array.isArray(r) && (r as unknown[]).length >= 3)
        .map((r) => {
          const row = r as unknown[];
          const method = String(row[0] ?? "");
          const amountStr = String(row[1] ?? "");
          const countStr = String(row[2] ?? "");
          const amountValue = parseMoney(amountStr);
          const countValue = Number(String(countStr).replace(/[^0-9.-]/g, "")) || 0;
          return { method, amount: amountStr, count: countStr, amountValue, countValue };
        });

      const totalRow = parsedRows.find((r) => r.method.trim().toLowerCase() === "total");
      const totalAmount = totalRow ? totalRow.amountValue : parsedRows.reduce((acc, r) => acc + r.amountValue, 0);
      const totalCount = totalRow ? totalRow.countValue : parsedRows.reduce((acc, r) => acc + r.countValue, 0);

      return { name: storeName, rows: parsedRows, totalAmount, totalCount };
    })
    .filter(Boolean);

  return NextResponse.json(
    { success: true, date: dateTo, assignedCompanyCount: allowedNames.size, stores },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    }
  );
}
