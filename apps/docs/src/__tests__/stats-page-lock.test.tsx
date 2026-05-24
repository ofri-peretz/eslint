/**
 * /stats regression-lock — source-string assertions per CLAUDE.md.
 *
 * /stats is the public data surface for the Interlace ecosystem. A silent
 * regression here (a chart dropped, a card swapped for a `<div>`, the
 * plugins table reverting to raw HTML, the NSM math reverting to the
 * old views+reactions+comments sum) erodes trust without showing up in CI
 * unless a structural lock catches it. Pattern mirrors `scorecard-lock`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Stats page: structure lock', () => {
  const pagePath = join(process.cwd(), 'src/app/stats/page.tsx');
  const layoutPath = join(process.cwd(), 'src/app/stats/layout.tsx');
  const impactCardPath = join(
    process.cwd(),
    'src/components/stats/impact-card.tsx',
  );
  const helperPath = join(process.cwd(), 'src/lib/stats-page.ts');
  let pageSource: string;
  let layoutSource: string;
  let impactCardSource: string;
  let helperSource: string;

  beforeAll(() => {
    pageSource = readFileSync(pagePath, 'utf-8');
    layoutSource = readFileSync(layoutPath, 'utf-8');
    impactCardSource = readFileSync(impactCardPath, 'utf-8');
    helperSource = readFileSync(helperPath, 'utf-8');
  });

  it('page + layout + helper + ImpactCard all exist', () => {
    expect(existsSync(pagePath)).toBe(true);
    expect(existsSync(layoutPath)).toBe(true);
    expect(existsSync(impactCardPath)).toBe(true);
    expect(existsSync(helperPath)).toBe(true);
  });

  describe('Required imports', () => {
    it('imports the data loader + PluginRow type from @/lib/stats-page', () => {
      expect(pageSource).toContain("from '@/lib/stats-page'");
      expect(pageSource).toContain('getStatsPageData');
      expect(pageSource).toContain('PluginRow');
    });

    it('imports shadcn primitives from @/components/ui/{card,table}', () => {
      expect(pageSource).toContain("from '@/components/ui/card'");
      expect(pageSource).toContain("from '@/components/ui/table'");
      for (const sym of [
        'Card',
        'CardHeader',
        'CardContent',
        'CardTitle',
        'Table',
        'TableHeader',
        'TableBody',
        'TableRow',
        'TableHead',
        'TableCell',
        'TableCaption',
      ]) {
        expect(pageSource).toContain(sym);
      }
    });

    it('imports DownloadsByPackage chart from @/components/charts', () => {
      expect(pageSource).toContain(
        "from '@/components/charts/downloads-by-package'",
      );
    });

    it('imports the shadcn ImpactCard from @/components/stats', () => {
      expect(pageSource).toContain("from '@/components/stats/impact-card'");
    });

    it('uses shadcn Badge for plugin-category cells (not raw <span>)', () => {
      expect(pageSource).toContain("from '@interlace/ui/badge'");
      expect(pageSource).toContain('<Badge');
    });

    it('names engagement as the North Star Metric', () => {
      expect(pageSource).toMatch(/North Star/i);
      expect(pageSource).toMatch(/engagement/i);
    });

    it('uses Container primitive (LAYOUT_PHILOSOPHY §2)', () => {
      expect(pageSource).toContain("from '@interlace/ui/container'");
      expect(pageSource).toContain('<Container');
    });

    it("opts into Next's static cache so JSON reads happen once at build", () => {
      expect(pageSource).toMatch(/export const dynamic\s*=\s*'force-static'/);
    });

    it('exports Next.js Metadata with /stats canonical', () => {
      expect(pageSource).toContain('export const metadata');
      expect(pageSource).toMatch(/alternates:\s*{\s*canonical:\s*'\/stats'/);
    });

    it('layout wraps with fumadocs HomeLayout (parity with /scorecard, /articles)', () => {
      expect(layoutSource).toContain("from 'fumadocs-ui/layouts/home'");
      expect(layoutSource).toContain('HomeLayout');
    });
  });

  describe('Required sections', () => {
    const REQUIRED_SECTION_IDS = [
      'impact-heading',
      'downloads-heading',
      'plugins-heading',
    ];

    it.each(REQUIRED_SECTION_IDS)(
      'pins section id=%s with matching aria-labelledby',
      (id) => {
        expect(pageSource).toContain(`id="${id}"`);
        expect(pageSource).toContain(`aria-labelledby="${id}"`);
      },
    );

    it('exposes catalog + live timestamps in the provenance footer', () => {
      expect(pageSource).toContain('catalogGeneratedAt');
      expect(pageSource).toContain('liveFetchedAt');
    });
  });

  describe('Plugins table columns', () => {
    const REQUIRED_COLUMNS = [
      'Plugin',
      'Category',
      'Rules',
      'Downloads / wk',
      'Coverage',
      'Version',
    ];

    it.each(REQUIRED_COLUMNS)(
      'renders a <TableHead>%s</TableHead> header (className optional)',
      (col) => {
        const escaped = col.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const re = new RegExp(`<TableHead\\b[^>]*>\\s*${escaped}\\s*</TableHead>`);
        expect(pageSource).toMatch(re);
      },
    );
  });

  describe('Plugins table cell content', () => {
    it('plugin name renders as a real npm link (not plain text)', () => {
      expect(pageSource).toMatch(
        /href=\{`https:\/\/www\.npmjs\.com\/package\/\$\{p\.name\}`\}/,
      );
      expect(pageSource).toMatch(/rel="noopener noreferrer"/);
      expect(pageSource).toMatch(/target="_blank"/);
    });

    it('description from plugin-stats.json is surfaced in the row', () => {
      expect(helperSource).toContain('description: p.description');
      expect(pageSource).toContain('{p.description}');
    });

    it('PluginRow type exposes description so callers can render it', () => {
      expect(helperSource).toMatch(/description:\s*string/);
    });
  });

  describe('Engagement NSM math', () => {
    it('helper exposes Reach + EngagementRate (not the old sum)', () => {
      expect(helperSource).toContain('reach');
      expect(helperSource).toContain('ratePercent');
      // The old misleading sum and breakdown shape must NOT come back.
      expect(helperSource).not.toMatch(/engagement\.total/);
      expect(helperSource).not.toMatch(/engagement\.breakdown/);
    });

    it('ImpactCard renders both Reach and Engagement rate', () => {
      expect(impactCardSource).toMatch(/Reach/);
      expect(impactCardSource).toMatch(/Engagement rate/);
    });
  });

  describe('Forbidden patterns', () => {
    it('forbids open-coded HTML <table> (must use @/components/ui/table primitive)', () => {
      expect(pageSource).not.toMatch(/<table[\s>]/);
      expect(pageSource).not.toMatch(/<\/table>/);
      expect(pageSource).not.toMatch(/<thead[\s>]/);
      expect(pageSource).not.toMatch(/<tbody[\s>]/);
    });

    it('forbids ad-hoc `max-w-*` widths beyond `max-w-prose` (LAYOUT_PHILOSOPHY §2)', () => {
      const matches = pageSource.match(/\bmax-w-(\w+)/g) ?? [];
      const offenders = matches.filter((m) => m !== 'max-w-prose');
      expect(offenders).toEqual([]);
    });

    it('forbids inline style props (feedback_no_inline_styles)', () => {
      expect(pageSource).not.toMatch(/style=\{\{/);
      expect(impactCardSource).not.toMatch(/style=\{\{/);
    });

    it('forbids the misleading engagement-as-sum NSM model in ImpactCard', () => {
      expect(impactCardSource).not.toMatch(/engagement\.total/);
      expect(impactCardSource).not.toMatch(/engagement\.breakdown/);
    });
  });
});
