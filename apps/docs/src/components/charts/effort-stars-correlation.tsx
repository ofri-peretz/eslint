"use client";

import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export interface EffortStarsDatum {
  /** Commits (effort) */
  x: number;
  /** Stars (outcome) */
  y: number;
  /** Repo / package name for the tooltip */
  name?: string;
  /** Optional bubble size proxy (downloads, e.g.) */
  z?: number;
}

interface EffortStarsCorrelationProps {
  points: EffortStarsDatum[];
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const chartConfig = {
  repos: {
    label: "Repos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function EffortStarsCorrelation({
  points,
}: EffortStarsCorrelationProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough data points yet to draw the correlation.
      </p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="h-80 w-full"
      role="img"
      aria-label="Scatter chart: effort (commits) versus stars, bubble size scaled by downloads"
    >
      <ScatterChart
        accessibilityLayer
        margin={{ top: 16, right: 16, left: 12, bottom: 8 }}
      >
        <CartesianGrid />
        <XAxis
          type="number"
          dataKey="x"
          name="Effort (commits)"
          tickFormatter={fmt}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="Stars"
          tickFormatter={fmt}
          tickLine={false}
          axisLine={false}
        />
        <ZAxis type="number" dataKey="z" range={[40, 240]} name="Downloads" />
        <ChartTooltip
          cursor={{ strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => `${name}: ${fmt(Number(value))}`}
            />
          }
        />
        <Scatter
          name="Repos"
          data={points}
          fill="var(--color-repos)"
          fillOpacity={0.7}
        />
      </ScatterChart>
    </ChartContainer>
  );
}
