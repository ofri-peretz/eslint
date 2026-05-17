"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface MetricsSnapshot {
  date: string;
  npm: { totalDownloads: number };
  github: { stars: number };
  devto: { views: number };
}

interface MetricsOverTimeProps {
  snapshots: MetricsSnapshot[];
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const chartConfig = {
  npm: {
    label: "npm downloads",
    color: "var(--chart-1)",
  },
  stars: {
    label: "GitHub stars",
    color: "var(--chart-2)",
  },
  views: {
    label: "Dev.to views",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function MetricsOverTime({ snapshots }: MetricsOverTimeProps) {
  const data = snapshots.map((s) => ({
    date: s.date,
    npm: s.npm.totalDownloads,
    stars: s.github.stars,
    views: s.devto.views,
  }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No historical data yet. Check back after the first snapshot lands.
      </p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-96 w-full"
      role="img"
      aria-label="Composed chart: npm downloads (area), GitHub stars and Dev.to views (lines) over time"
    >
      <ComposedChart
        accessibilityLayer
        data={data}
        margin={{ top: 16, right: 16, left: 12, bottom: 8 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tickFormatter={fmt}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={fmt}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value, name) =>
                `${chartConfig[name as keyof typeof chartConfig]?.label ?? name}: ${fmt(Number(value))}`
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="npm"
          stroke="var(--color-npm)"
          fill="var(--color-npm)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="stars"
          stroke="var(--color-stars)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="views"
          stroke="var(--color-views)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
