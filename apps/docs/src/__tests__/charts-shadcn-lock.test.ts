/**
 * Charts shadcn-conformance lock — every chart in `src/components/charts/`
 * must wrap its recharts primitive in `<ChartContainer>` with a `ChartConfig`,
 * not bare `<ResponsiveContainer>` with inline-styled `<Tooltip contentStyle>`.
 *
 * These are app-local copies (separate from the `.interlace/` synced mirror)
 * so /stats is insulated from baseline-sync drift while shadcn-ification
 * propagates across the other consumers. See CLAUDE.md "regressions are the
 * issue".
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');

const CHART_FILES = [
  'downloads-by-package.tsx',
  'metrics-over-time.tsx',
  'effort-stars-correlation.tsx',
] as const;

const chartsDir = join(APP_ROOT, 'src/components/charts');

describe.each(CHART_FILES)('Chart %s: shadcn conformance', (file) => {
  let src: string;

  beforeAll(() => {
    src = readFileSync(join(chartsDir, file), 'utf-8');
  });

  it('imports ChartContainer + ChartConfig from @/components/ui/chart', () => {
    expect(src).toContain('from "@/components/ui/chart"');
    expect(src).toContain('ChartContainer');
    expect(src).toContain('ChartConfig');
  });

  it('declares a ChartConfig that satisfies the ChartConfig type', () => {
    expect(src).toMatch(/satisfies\s+ChartConfig/);
  });

  it('uses ChartTooltipContent (not raw recharts <Tooltip contentStyle>)', () => {
    expect(src).toContain('ChartTooltipContent');
    expect(src).not.toMatch(/contentStyle\s*=/);
  });

  it('drops hard-coded oklch(...) color literals (use --chart-N tokens)', () => {
    expect(src).not.toMatch(/oklch\s*\(/);
  });

  it('drops bare <ResponsiveContainer> (ChartContainer wraps it internally)', () => {
    expect(src).not.toContain('ResponsiveContainer');
  });
});
