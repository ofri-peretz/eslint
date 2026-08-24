/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `/changelog` regression lock — per CLAUDE.md.
 *
 * The changelog is the storefront's answer to "what changed lately", and three
 * of its properties are invisible in review yet break the page outright:
 *
 *   1. **The generated data must be present and shaped.** The page reads
 *      `src/data/changelog.json`; if a sync drops fields or the file goes
 *      stale, the page still builds and quietly shows less than it should.
 *   2. **Inline markdown must render.** 56% of entry titles contain
 *      `inline code` and 17% a markdown link. Rendering them as plain text is
 *      not a crash — it just shows the reader raw backticks, which no test
 *      would catch without asserting it.
 *   3. **It must stay server-rendered.** Filtering and paging are URL state
 *      precisely so the page ships no JavaScript. A stray `'use client'`
 *      silently turns a static page into a hydrated one.
 *
 * Pattern mirrors `plugin-finder-lock.test.tsx`.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const APP_ROOT = resolve(__dirname, '../..');

const pagePath = join(APP_ROOT, 'src/app/changelog/page.tsx');
const listPath = join(APP_ROOT, 'src/components/changelog/release-list.tsx');
const filtersPath = join(
  APP_ROOT,
  'src/components/changelog/changelog-filters.tsx',
);
const paginationPath = join(
  APP_ROOT,
  'src/components/changelog/changelog-pagination.tsx',
);
const inlinePath = join(
  APP_ROOT,
  'src/components/changelog/inline-markdown.tsx',
);
const dataLibPath = join(APP_ROOT, 'src/lib/changelog-data.ts');
const dataPath = join(APP_ROOT, 'src/data/changelog.json');

describe('Changelog page: files exist', () => {
  it.each([
    ['page', pagePath],
    ['release list', listPath],
    ['filters', filtersPath],
    ['pagination', paginationPath],
    ['inline markdown', inlinePath],
    ['data layer', dataLibPath],
    ['generated data', dataPath],
  ])('%s', (_label, path) => {
    expect(existsSync(path)).toBe(true);
  });
});

describe('Changelog page: structure', () => {
  let page: string;
  let list: string;
  let filters: string;

  beforeAll(() => {
    page = readFileSync(pagePath, 'utf-8');
    list = readFileSync(listPath, 'utf-8');
    filters = readFileSync(filtersPath, 'utf-8');
  });

  it('builds on the layout primitives, not open-coded wrappers', () => {
    expect(page).toContain("from '@interlace/ui/section'");
    expect(page).toContain("from '@interlace/ui/blocks/section-header'");
    // LAYOUT_PHILOSOPHY.md: no ad-hoc containers or widths.
    expect(page).not.toMatch(/<section\s+className=/);
    expect(page).not.toMatch(/max-w-\[/);
  });

  it('stays server-rendered — no client island', () => {
    // The whole design is URL state so the page ships zero JS. A `'use client'`
    // here would hydrate a list of links for nothing.
    for (const source of [page, list, filters]) {
      expect(source).not.toMatch(/^['"]use client['"]/m);
    }
  });

  it('is statically rendered', () => {
    expect(page).toContain("export const dynamic = 'force-static'");
  });

  it('reads filter and page from the URL, not from component state', () => {
    expect(page).toContain('searchParams');
    expect(page).not.toContain('useState');
  });

  it('renders entry titles through the inline-markdown renderer', () => {
    // Plain `{entry.title}` shows raw backticks to the 56% of entries that
    // contain inline code.
    expect(list).toContain('InlineMarkdown');
    expect(list).not.toMatch(/>\{entry\.title\}</);
  });

  it('collapses the chip cloud so releases stay on the first screen', () => {
    // 34 wrapped chips are ~5 rows of filter before the first release — on
    // desktop as well as mobile. The cloud lives inside a native <details>
    // (zero JS, links stay in the DOM for crawlers), and the always-visible
    // row carries only the reset chip and the active filter.
    // JSX-shaped anchors (className present) so a docstring mentioning the
    // elements can never satisfy this — the comment-trap lock-integrity hunts.
    expect(filters).toContain('<details className=');
    expect(filters).toContain('<summary className=');
    // The reset + active-filter row must exist outside the disclosure.
    expect(filters.indexOf('>All packages</Badge>')).toBeLessThan(
      filters.indexOf('<details className='),
    );
  });

  it('announces the active filter', () => {
    expect(filters).toContain('aria-current');
    expect(filters).toContain('aria-label');
  });
});

describe('Changelog data: shape', () => {
  interface Entry {
    kind: string;
    title: string;
    pr: number | null;
  }
  interface Release {
    package: string;
    short: string;
    version: string;
    date: string | null;
    isApp: boolean;
    isPrivate: boolean;
    entries: Entry[];
  }
  interface Payload {
    releaseCount: number;
    packageCount: number;
    entryCount: number;
    releases: Release[];
  }

  let data: Payload;

  beforeAll(() => {
    data = JSON.parse(readFileSync(dataPath, 'utf-8')) as Payload;
  });

  it('has releases (guards against a vacuous pass on an empty sync)', () => {
    expect(data.releases.length).toBeGreaterThan(50);
    expect(data.releaseCount).toBe(data.releases.length);
  });

  it('every release carries the fields the page renders', () => {
    for (const release of data.releases) {
      expect(typeof release.package).toBe('string');
      expect(release.package).not.toBe('');
      expect(release.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(Array.isArray(release.entries)).toBe(true);
      // A release with no entries is a bump with nothing to say; the sync
      // drops those rather than render an empty card.
      expect(release.entries.length).toBeGreaterThan(0);
    }
  });

  it('every entry has a non-empty title', () => {
    for (const release of data.releases) {
      for (const entry of release.entries) {
        expect(entry.title.trim()).not.toBe('');
      }
    }
  });

  it('dates parse and are not in the future', () => {
    const now = Date.now();
    for (const release of data.releases) {
      if (!release.date) continue;
      const t = new Date(release.date).getTime();
      expect(Number.isNaN(t)).toBe(false);
      // A tag date ahead of now means the clock or the parser is wrong, and
      // the list is sorted by this field.
      expect(t).toBeLessThanOrEqual(now + 86_400_000);
    }
  });

  it('is sorted newest first', () => {
    const dated = data.releases.filter((r) => r.date).map((r) => r.date!);
    const sorted = [...dated].sort().reverse();
    expect(dated).toEqual(sorted);
  });

  it('entry titles carry no leftover link plumbing', () => {
    // `parseBullet` strips the `[#123](…) Thanks [@user](…)! - ` prefix the
    // legacy changelog-github format wrote. If that regressed, titles would
    // start with a bracket and the page would show 120 characters of URL.
    for (const release of data.releases) {
      for (const entry of release.entries) {
        expect(entry.title).not.toMatch(/^\[#\d+\]\(/);
        expect(entry.title).not.toContain('Thanks [@');
      }
    }
  });
});
