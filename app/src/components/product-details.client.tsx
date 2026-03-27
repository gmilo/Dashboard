"use client";

import useSWR from "swr";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductSalesChart, type ProductSalesPoint } from "@/components/product-sales-chart";

type ProductResponse = { success: boolean; data?: Record<string, unknown>; error?: string };
type ProductSalesResponse = {
  success: boolean;
  group_by: "day" | "week" | "month";
  summary?: Record<string, unknown> | null;
  data?: Array<Record<string, unknown>>;
  error?: string;
};

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export function ProductDetails({ id }: { id: string }) {
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const { data: product, error: productError, isLoading: productLoading } = useSWR<ProductResponse>(["product", id], async () => {
    const res = await fetch(`/api/products/${id}`);
    const json = (await res.json()) as ProductResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Product load failed");
    return json;
  });

  const { data: sales, error: salesError, isLoading: salesLoading } = useSWR<ProductSalesResponse>(["product-sales", id, groupBy], async () => {
    const url = new URL(`/api/products/${id}/sales`, window.location.origin);
    url.searchParams.set("group_by", groupBy);
    const res = await fetch(url.toString());
    const json = (await res.json()) as ProductSalesResponse;
    if (!res.ok || !json.success) throw new Error(json.error ?? "Sales load failed");
    return json;
  });

  const p = product?.data ?? null;
  const title =
    (typeof p?.["display_name"] === "string" && (p["display_name"] as string)) ||
    (typeof p?.["item_name"] === "string" && (p["item_name"] as string)) ||
    (typeof p?.["name"] === "string" && (p["name"] as string)) ||
    `Product #${id}`;

  const companyId = p ? toNumber(p["company_id"]) : 0;
  const tag = typeof p?.["tag"] === "string" ? (p["tag"] as string) : "";
  const category = typeof p?.["category_name"] === "string" ? (p["category_name"] as string) : typeof p?.["category"] === "string" ? (p["category"] as string) : "";
  const sku = typeof p?.["sku"] === "string" ? (p["sku"] as string) : typeof p?.["product_id"] === "string" ? (p["product_id"] as string) : "";
  const unitPrice = toNumber(p?.["unit_price"] ?? p?.["price"]);

  const summary = sales?.summary ?? null;
  const totalSold = toNumber(summary?.["total_quantity"]);
  const totalRevenue = toNumber(summary?.["total_revenue"]);
  const avgSold = toNumber(summary?.["avg_quantity_per_period"]);
  const avgRevenue = toNumber(summary?.["avg_revenue_per_period"]);

  const points: ProductSalesPoint[] = useMemo(() => {
    const rows = Array.isArray(sales?.data) ? sales!.data! : [];
    return rows.map((r) => ({
      period: String(r["period"] ?? ""),
      quantity: toNumber(r["total_quantity"]),
      revenue: toNumber(r["total_revenue"])
    }));
  }, [sales]);

  if (productError || salesError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
        Failed to load: {(productError ?? salesError)?.message ?? "Unknown error"}
      </div>
    );
  }

  if (productLoading || salesLoading || !product || !sales) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-800" href="/drinks">
          ← Back
        </Link>
        <select
          className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-800"
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as any)}
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Product ID</div>
            <div className="font-semibold">#{id}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">Company ID</div>
            <div className="font-semibold">#{companyId}</div>
          </div>
          {sku ? (
            <div>
              <div className="text-slate-500 dark:text-slate-400">SKU</div>
              <div className="font-semibold">{sku}</div>
            </div>
          ) : null}
          {unitPrice ? (
            <div>
              <div className="text-slate-500 dark:text-slate-400">Unit price</div>
              <div className="font-semibold">{money(unitPrice)}</div>
            </div>
          ) : null}
          {category ? (
            <div>
              <div className="text-slate-500 dark:text-slate-400">Category</div>
              <div className="font-semibold">{category}</div>
            </div>
          ) : null}
          {tag ? (
            <div>
              <div className="text-slate-500 dark:text-slate-400">Tag</div>
              <div className="font-semibold">{tag}</div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Metric label="Total sold" value={new Intl.NumberFormat("en-AU").format(totalSold)} />
        <Metric label="Total revenue" value={money(totalRevenue)} />
        <Metric label={`Avg sold / ${groupBy}`} value={new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 }).format(avgSold)} />
        <Metric label={`Avg rev / ${groupBy}`} value={money(avgRevenue)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold">Sales history ({groupBy})</div>
        <div className="mt-3">
          <ProductSalesChart points={points} groupBy={groupBy} />
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

