/**
 * shadcn primitive presence lock — guarantees the three primitives the
 * /stats page depends on stay wired at their canonical `@/components/ui/`
 * paths. Without these the page silently 500s in prod.
 *
 * `card` is a re-export shim over `@interlace/ui/card`; `chart` and `table`
 * are local because they aren't in the shared `@interlace/ui` package yet
 * (chart pulls in the recharts dep, table is just not yet promoted).
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Use __dirname so this works regardless of whether vitest is invoked from the
// repo root (npx vitest run apps/docs/…) or from apps/docs (turbo run test).
const APP_ROOT = resolve(__dirname, '../..');
const uiDir = join(APP_ROOT, 'src/components/ui');

describe('shadcn primitives: presence lock', () => {
  it('chart.tsx exists with all canonical exports', () => {
    const file = join(uiDir, 'chart.tsx');
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, 'utf-8');
    for (const sym of [
      'ChartContainer',
      'ChartTooltip',
      'ChartTooltipContent',
      'ChartLegend',
      'ChartLegendContent',
      'ChartStyle',
      'useChart',
    ]) {
      expect(src).toContain(sym);
    }
    // Must consume recharts internally — otherwise it's not the shadcn shape.
    expect(src).toContain('from "recharts"');
  });

  it('card.tsx exists and re-exports from @interlace/ui/card', () => {
    const file = join(uiDir, 'card.tsx');
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, 'utf-8');
    expect(src).toContain("from '@interlace/ui/card'");
    for (const sym of [
      'Card',
      'CardHeader',
      'CardFooter',
      'CardTitle',
      'CardDescription',
      'CardContent',
    ]) {
      expect(src).toContain(sym);
    }
  });

  it('table.tsx exists with all canonical exports', () => {
    const file = join(uiDir, 'table.tsx');
    expect(existsSync(file)).toBe(true);
    const src = readFileSync(file, 'utf-8');
    for (const sym of [
      'Table',
      'TableHeader',
      'TableBody',
      'TableFooter',
      'TableHead',
      'TableRow',
      'TableCell',
      'TableCaption',
    ]) {
      expect(src).toContain(sym);
    }
  });
});
