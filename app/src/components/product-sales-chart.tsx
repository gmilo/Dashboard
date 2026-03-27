"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ProductSalesPoint = {
  period: string;
  quantity: number;
  revenue: number;
};

function labelForPeriod(period: string, groupBy: "day" | "week" | "month") {
  const dt = new Date(period);
  if (!Number.isFinite(dt.getTime())) return period;

  if (groupBy === "month") {
    return new Intl.DateTimeFormat("en-AU", { month: "short", year: "2-digit" }).format(dt);
  }
  if (groupBy === "week") {
    return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(dt);
  }
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(dt);
}

export function ProductSalesChart({ points, groupBy }: { points: ProductSalesPoint[]; groupBy: "day" | "week" | "month" }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  if (!points.length) {
    return <div className="text-xs text-slate-500 dark:text-slate-400">No sales history</div>;
  }

  // Backend sorts DESC; chart reads better ASC.
  const ordered = [...points].sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
  const categories = ordered.map((p) => labelForPeriod(p.period, groupBy));
  const qty = ordered.map((p) => p.quantity);
  const rev = ordered.map((p) => p.revenue);
  const maxQty = Math.max(0, ...qty);

  return (
    <div className="h-56">
      <ReactApexChart
        type="line"
        height={224}
        series={[
          { name: "Qty", type: "column", data: qty },
          { name: "Revenue", type: "line", data: rev }
        ]}
        options={{
          chart: { type: "line", toolbar: { show: false }, foreColor: dark ? "#cbd5e1" : "#334155" },
          colors: ["#22c55e", "#3b82f6"],
          theme: { mode: dark ? "dark" : "light" },
          stroke: { width: [0, 2], curve: "smooth" },
          fill: { opacity: [0.9, 1] },
          plotOptions: { bar: { columnWidth: "55%", borderRadius: 4 } },
          grid: { strokeDashArray: 4, borderColor: dark ? "#1f2937" : "#e2e8f0" },
          dataLabels: { enabled: false },
          xaxis: { categories, labels: { show: true, rotate: 0, style: { fontSize: "10px" } } },
          yaxis: [{ min: 0, max: maxQty, labels: { show: false } }, { min: 0, opposite: true, labels: { show: false } }],
          tooltip: {
            theme: dark ? "dark" : "light",
            y: {
              formatter: (val: number, opts?: any) => {
                const seriesName = opts?.w?.globals?.seriesNames?.[opts?.seriesIndex ?? 0] as string | undefined;
                if (seriesName?.toLowerCase().includes("rev")) {
                  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(val);
                }
                return new Intl.NumberFormat("en-AU").format(val);
              }
            }
          },
          legend: { show: false }
        }}
      />
    </div>
  );
}

