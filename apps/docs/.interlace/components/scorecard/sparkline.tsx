/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";

export interface SparklineProps extends React.SVGAttributes<SVGSVGElement> {
  /** Numeric series, oldest first. */
  data: ReadonlyArray<number>;
  /** SVG width in px (default 96). */
  width?: number;
  /** SVG height in px (default 28). */
  height?: number;
  /** Color via CSS variable; defaults to `currentColor`. */
  stroke?: string;
  /** Stroke width in px (default 1.5). */
  strokeWidth?: number;
  /** Render a soft gradient fill under the line. */
  filled?: boolean;
}

/**
 * Inline SVG sparkline — no chart library, no client JS, no axes.
 * Renders a single monotonic-ish line through the supplied data points.
 * Designed for ratchet cards: ~96×28px, single color, inherits text color.
 *
 * Renders nothing when data is empty or all-equal (no visible trend).
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  stroke = "currentColor",
  strokeWidth = 1.5,
  filled = false,
  className,
  ...rest
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoid divide-by-zero on flat series

  const pad = strokeWidth;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = innerW / (data.length - 1);

  const points = data.map((value, i) => {
    const x = pad + step * i;
    const y = pad + innerH - ((value - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");

  const areaPath = filled
    ? `${linePath} L${points[points.length - 1]![0]},${height - pad} L${points[0]![0]},${height - pad} Z`
    : null;

  return (
    <svg
      data-slot="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Trend across ${data.length} data points`}
      className={cn("inline-block align-middle", className)}
      {...rest}
    >
      {areaPath && (
        <path d={areaPath} fill={stroke} fillOpacity={0.12} stroke="none" />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
