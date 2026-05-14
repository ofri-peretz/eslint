/**
 * Unit tests for scripts/lib/report-format.ts — the shared markdown
 * helpers used by the three pilot audit reports. Verifies every helper
 * round-trips its contract:
 *   - badge URLs are well-formed shields.io static-badge URLs.
 *   - reportHeader emits the canonical H1 + badge-row + headline
 *     structure within the first 15 lines (the format-lock contract).
 *   - callout produces a valid GFM `> [!KIND]` block with continuation.
 *   - collapsible wraps body in `<details>` with the blank lines GitHub
 *     needs to render markdown inside.
 *   - table auto-right-aligns numeric columns and truncates wide cells.
 *
 * Run from the repo root:
 *   npx vitest run scripts/lib/report-format.test.ts
 */

import { describe, it, expect } from 'vitest';

import {
  callout,
  collapsible,
  howToRead,
  kvBadge,
  kvSummary,
  reportHeader,
  statusBadge,
  table,
} from '../lib/report-format.ts';

describe('statusBadge', () => {
  it('emits a shields.io URL with the correct colour for each level', () => {
    expect(statusBadge('pass', 'passing')).toContain('img.shields.io/badge/');
    expect(statusBadge('pass', 'passing')).toContain('brightgreen');
    expect(statusBadge('fail', 'over budget')).toContain('red');
    expect(statusBadge('warn', 'attention')).toContain('yellow');
    expect(statusBadge('stale', 'older than 30d')).toContain('lightgrey');
    expect(statusBadge('info', 'methodology v1')).toContain('blue');
  });

  it('renders as a markdown image with an alt text', () => {
    const b = statusBadge('pass', 'all good');
    expect(b.startsWith('![pass: all good](')).toBe(true);
    expect(b.endsWith(')')).toBe(true);
  });

  it('escapes hyphens, underscores, and spaces per shields.io conventions', () => {
    // 'fail-fast_test run' → '-' becomes '--', '_' becomes '__', ' ' becomes '_'
    // then URL-encoded.
    const b = statusBadge('fail', 'fail-fast_test run');
    expect(b).toContain('fail--fast__test_run');
  });
});

describe('kvBadge', () => {
  it('emits a two-segment badge with both halves escaped', () => {
    const b = kvBadge('as of', '2026-05-13', 'stale');
    expect(b).toContain('as_of');
    expect(b).toContain('2026--05--13');
    expect(b).toContain('lightgrey');
  });
});

describe('reportHeader', () => {
  const sample = {
    title: 'API-surface coverage',
    status: 'pass' as const,
    statusLabel: '10/10 plugins at floor',
    headlineSentence: '10/10 plugins at or above the 60% floor — aggregate 78%.',
    headlineMetric: { label: 'aggregate', value: '78%' },
    asOf: '2026-05-13',
    generatedBy: 'npm run audit:api-surface',
    sourceFile: '.agent/api-surface-manifest.json',
    extraMeta: 'Floor: 60% per plugin.',
  };

  it('starts with an H1 and places the badge row in the first 15 lines', () => {
    const out = reportHeader(sample);
    const lines = out.split('\n');
    expect(lines[0]).toBe('# API-surface coverage');
    const badgeLine = lines.slice(0, 15).find((l) => l.includes('img.shields.io/badge/'));
    expect(badgeLine).toBeDefined();
  });

  it('includes the status badge, as-of pill, and headline-metric pill', () => {
    const out = reportHeader(sample);
    expect(out).toContain('brightgreen');
    expect(out).toContain('2026--05--13');
    expect(out).toContain('aggregate');
  });

  it('includes the generated-by + source-file footer', () => {
    const out = reportHeader(sample);
    expect(out).toContain('`npm run audit:api-surface`');
    expect(out).toContain('`.agent/api-surface-manifest.json`');
    expect(out).toContain('Floor: 60% per plugin.');
  });

  it('omits the headline-metric pill when not provided', () => {
    const { headlineMetric: _hm, ...withoutMetric } = sample;
    const out = reportHeader(withoutMetric);
    // The badge row should have exactly 2 shields URLs (status + as-of),
    // not 3 — the prose headline mentioning "aggregate" is fine, it's
    // the third badge URL that must be absent.
    const badgeUrls = out.match(/img\.shields\.io\/badge\//g) ?? [];
    expect(badgeUrls).toHaveLength(2);
  });
});

describe('callout', () => {
  it('emits a GFM-native callout with the kind label', () => {
    const out = callout('WARNING', 'Live-feed entries over target.');
    expect(out.startsWith('> [!WARNING]')).toBe(true);
    expect(out).toContain('> Live-feed entries over target.');
  });

  it('continues the `>` prefix on every body line including blanks', () => {
    const out = callout('NOTE', 'First line.\n\nSecond paragraph.');
    expect(out).toContain('> First line.');
    expect(out).toContain('>\n');
    expect(out).toContain('> Second paragraph.');
  });

  it('accepts every supported kind', () => {
    for (const kind of ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'] as const) {
      expect(callout(kind, 'body')).toContain(`> [!${kind}]`);
    }
  });
});

describe('collapsible', () => {
  it('wraps body in <details> with blank lines around the inner block', () => {
    const out = collapsible('Click me', '| col |\n| :--- |\n| cell |');
    expect(out).toContain('<details>');
    expect(out).toContain('<summary>Click me</summary>');
    // The blank line between summary and body is what GitHub needs to
    // render markdown inside a <details>.
    expect(out).toMatch(/<summary>Click me<\/summary>\n\n\|/);
    expect(out).toMatch(/\|\n\n<\/details>/);
  });
});

describe('howToRead', () => {
  it('produces a single trailing <details><summary>How to read this</summary> block', () => {
    const out = howToRead('Methodology details.');
    expect(out).toContain('<summary>How to read this</summary>');
    expect(out).toContain('Methodology details.');
  });
});

describe('table', () => {
  it('right-aligns columns where every non-empty cell is numeric', () => {
    const out = table({
      head: ['Rule', 'Count', 'Latency'],
      rows: [
        ['no-cycle', 5243, '470ms'],
        ['no-redos', 1, '194ms'],
      ],
    });
    const lines = out.split('\n');
    expect(lines[1]).toBe('| :--- | ---: | ---: |');
  });

  it('left-aligns text columns and accepts explicit alignment overrides', () => {
    const out = table({
      head: ['Plugin', 'OK?'],
      rows: [
        ['secure-coding', '✅'],
        ['pg', '✅'],
      ],
      align: ['left', 'center'],
    });
    const lines = out.split('\n');
    expect(lines[1]).toBe('| :--- | :---: |');
  });

  it('renders null/undefined cells as em-dash', () => {
    const out = table({
      head: ['Rule', 'p50'],
      rows: [['fast', null], ['slow', undefined]],
    });
    expect(out).toContain('| fast | — |');
    expect(out).toContain('| slow | — |');
  });

  it('truncates cells over maxCellWidth with a single …', () => {
    const longMessage = 'x'.repeat(300);
    const out = table({
      head: ['Rule', 'Message'],
      rows: [['huge', longMessage]],
      maxCellWidth: 50,
    });
    expect(out).toContain('…');
    // No row should be longer than 200 chars when maxCellWidth is sane.
    for (const line of out.split('\n')) {
      expect(line.length).toBeLessThan(200);
    }
  });
});

describe('kvSummary', () => {
  it('emits a 2-col table with right-aligned values', () => {
    const out = kvSummary([
      { key: 'Aggregate coverage', value: '78%' },
      { key: 'Plugins at/above floor', value: '10' },
    ]);
    const lines = out.split('\n');
    expect(lines[0]).toBe('| Metric | Value |');
    expect(lines[1]).toBe('| :--- | ---: |');
    expect(out).toContain('| Aggregate coverage | 78% |');
  });
});
