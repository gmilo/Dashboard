import { NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { config } from "@/lib/config";
import { companiesFromAuth0User } from "@/lib/auth-companies";

type UpstreamResponse = {
  success: boolean;
  data?: unknown;
  error?: unknown;
};

function parseMoney(input: unknown): number {
  if (typeof input === "number") return input;
  const s = String(input ?? "");
  const cleaned = s.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : null;
}

type DashifySalesCompany = {
  company_id: number;
  company_name?: string;
  totals: Array<{
    payment_type: string;
    total_amount: number;
    transaction_count: number | null;
  }>;
};

function isDashifySalesCompany(value: unknown): value is DashifySalesCompany {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const companyId = toNumber(v.company_id);
  const totals = v.totals;
  return typeof companyId === "number" && Array.isArray(totals);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const companies = companiesFromAuth0User(session.user);
  const allowedIds = new Set(companies.map((c) => c.id));
  const companyNameById = new Map(companies.map((c) => [c.id, c.name ?? `Company ${c.id}`]));

  const url = new URL(request.url);
  const dateFromParam = url.searchParams.get("date_from")?.trim();
  const dateToParam = url.searchParams.get("date_to")?.trim();
  const dateFrom = dateFromParam || dateToParam;
  const dateTo = dateToParam || dateFromParam;
  if (!dateFrom || !dateTo) {
    return NextResponse.json({ success: false, error: "Missing date range" }, { status: 400 });
  }

  // If the user has no assigned companies, short-circuit.
  if (!allowedIds.size) {
    return NextResponse.json({
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      assignedCompanyCount: 0,
      totals: { gross: 0, discount: 0, final: 0 },
      stores: []
    });
  }

  const upstreamUrl = new URL(`${config.dataBaseUrl}/dashify-sales.php`);
  upstreamUrl.searchParams.set("date_from", dateFrom);
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

  const companiesPayload = Array.isArray(json.data) ? (json.data as unknown[]) : [];
  const allowedCompanies = companiesPayload
    .filter((c) => isDashifySalesCompany(c) && allowedIds.has((c as DashifySalesCompany).company_id))
    .map((c) => c as DashifySalesCompany);

  // Aggregate: per company, per payment method.
  const byCompany = new Map<
    number,
    {
      company_id: number;
      name: string;
      payments: Map<string, { method: string; amountValue: number; countValue: number }>;
      collected: number;
      refunds: number;
      discount: number;
    }
  >();

  for (const comp of allowedCompanies) {
    const companyId = comp.company_id;
    const name = comp.company_name ?? companyNameById.get(companyId) ?? `Company ${companyId}`;
    const existing =
      byCompany.get(companyId) ??
      {
        company_id: companyId,
        name,
        payments: new Map(),
        collected: 0,
        refunds: 0,
        discount: 0,
        // computed later
      };

    for (const t of comp.totals ?? []) {
      const method = String((t as any)?.payment_type ?? "").trim() || "Unknown";
      const amount = parseMoney((t as any)?.total_amount);
      const count = Math.max(0, Number((t as any)?.transaction_count ?? 0) || 0);

      const methodLower = method.toLowerCase();
      if (methodLower === "discount") {
        existing.discount += amount;
        continue;
      }

      if (methodLower.includes("refund")) {
        existing.refunds += amount;
        continue;
      }

      existing.collected += amount;

      const p = existing.payments.get(method) ?? { method, amountValue: 0, countValue: 0 };
      p.amountValue += amount;
      p.countValue += count;
      existing.payments.set(method, p);
    }

    byCompany.set(companyId, existing);
  }

  const stores = Array.from(byCompany.values())
    .map((c) => {
      const payments = Array.from(c.payments.values()).sort((a, b) => b.amountValue - a.amountValue);
      const rowsOut = payments.map((p) => ({ method: p.method, amountValue: p.amountValue, countValue: p.countValue }));

      if (c.refunds) {
        rowsOut.unshift({
          method: "Refunds",
          amountValue: -Math.abs(c.refunds),
          countValue: 0
        });
      }

      // Add a discount line (negative) if any.
      if (c.discount) {
        rowsOut.unshift({
          method: "Discount",
          amountValue: -Math.abs(c.discount),
          countValue: 0
        });
      }

      // Add total line.
      const net = c.collected - c.refunds;
      rowsOut.push({
        method: "Total",
        amountValue: net,
        countValue: 0
      });

      return {
        company_id: c.company_id,
        name: c.name,
        rows: rowsOut,
        gross: c.collected + c.discount,
        refunds: c.refunds,
        discount: c.discount,
        totalAmount: net,
        totalCount: payments.reduce((acc, p) => acc + p.countValue, 0)
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount);

  const totals = stores.reduce(
    (acc, s) => {
      acc.gross += s.gross;
      acc.refunds += s.refunds ?? 0;
      acc.discount += s.discount;
      acc.final += s.totalAmount;
      return acc;
    },
    { gross: 0, refunds: 0, discount: 0, final: 0 }
  );

  return NextResponse.json(
    {
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      assignedCompanyCount: allowedIds.size,
      totals,
      stores
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30"
      }
    }
  );
}
