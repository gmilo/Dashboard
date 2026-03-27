"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type HourlyPoint = {
  hour: string; // "09:00:00"
  cups: number;
  txns: number;
  amount: number; // total $ for the hour
};

function hourLabel(hhmmss: string): string {
  // "09:00:00" -> "9am"
  const hour = Number(hhmmss.slice(0, 2));
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = ((hour + 11) % 12) + 1;
  return `${h12}${ampm}`;
}

export function HourlySalesChart({
  today,
  yesterday
}: {
  today: HourlyPoint[];
  yesterday: HourlyPoint[];
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const hours = Array.from(new Set([...today.map((p) => p.hour), ...yesterday.map((p) => p.hour)])).sort();
  if (hours.length === 0) {
    return <div className="text-xs text-slate-500 dark:text-slate-400">No hourly data</div>;
  }
  const categories = hours.map((h) => hourLabel(h));

  const todayByHour = new Map(today.map((p) => [p.hour, p]));
  const yesterdayByHour = new Map(yesterday.map((p) => [p.hour, p]));

  const cupsToday = hours.map((h) => todayByHour.get(h)?.cups ?? 0);
  const cupsYesterday = hours.map((h) => yesterdayByHour.get(h)?.cups ?? 0);
  const amountToday = hours.map((h) => todayByHour.get(h)?.amount ?? 0);
  const maxCups = Math.max(0, ...cupsToday, ...cupsYesterday);

  return (
    <div className="h-44">
      <ReactApexChart
        type="line"
        height={176}
        series={[
          {
            name: "Cups Today",
            type: "column",
            data: cupsToday
          },
          {
            name: "Cups Yesterday",
            type: "column",
            data: cupsYesterday
          },
          {
            name: "Sales ($)",
            type: "line",
            data: amountToday
          }
        ]}
        options={{
          chart: {
            type: "line",
            toolbar: { show: false },
            sparkline: { enabled: false },
            foreColor: dark ? "#cbd5e1" : "#334155",
            stacked: false
          },
          // Explicit colors improve light-mode contrast and make Today vs Yesterday obvious.
          colors: ["#0ea5e9", "#94a3b8", "#16a34a"],
          theme: { mode: dark ? "dark" : "light" },
          stroke: { width: [0, 0, 2], curve: "smooth" },
          fill: { opacity: [1, 0.45, 1] },
          plotOptions: {
            bar: {
              columnWidth: "55%",
              borderRadius: 4
            }
          },
          grid: { strokeDashArray: 4, borderColor: dark ? "#1f2937" : "#e2e8f0" },
          dataLabels: { enabled: false },
          xaxis: {
            categories,
            labels: { show: true, rotate: 0, style: { fontSize: "10px" } },
            tooltip: { enabled: false }
          },
          yaxis: [
            // IMPORTANT: keep both cups series on the same scale by forcing the same max.
            { min: 0, max: maxCups, labels: { show: false } },
            { min: 0, max: maxCups, labels: { show: false } },
            { min: 0, opposite: true, labels: { show: false } }
          ],
          tooltip: {
            theme: dark ? "dark" : "light",
            x: { show: true },
            y: {
              formatter: (val: number, opts?: any) => {
                const seriesName = opts?.w?.globals?.seriesNames?.[opts?.seriesIndex ?? 0] as string | undefined;
                if (seriesName?.toLowerCase().includes("cup")) {
                  return new Intl.NumberFormat("en-AU").format(val);
                }
                return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(val);
              }
            }
          },
          legend: { show: false }
        }}
      />
    </div>
  );
}
