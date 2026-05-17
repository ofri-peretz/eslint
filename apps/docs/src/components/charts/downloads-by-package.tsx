"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface PackageDatum {
  name: string;
  downloads: number;
}

interface DownloadsByPackageProps {
  packages: PackageDatum[];
  /** Top-N to show. Defaults to 10. */
  limit?: number;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const chartConfig = {
  downloads: {
    label: "Downloads",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function DownloadsByPackage({
  packages,
  limit = 10,
}: DownloadsByPackageProps) {
  const data = [...packages]
    .filter((p) => p.downloads > 0)
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, limit)
    .map((p) => ({
      name: p.name.replace(/^eslint-plugin-/, ""),
      downloads: p.downloads,
    }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No package data yet.</p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-80 w-full"
      role="img"
      aria-label={`Bar chart: top ${data.length} packages by weekly npm downloads`}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={fmt}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          cursor={{ fillOpacity: 0.04 }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) => `${fmt(Number(value))} downloads`}
            />
          }
        />
        <Bar
          dataKey="downloads"
          fill="var(--color-downloads)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
