/**
 * Landscape framing lock for the scorecard surfaces.
 *
 * The ecosystem's public voice is landscape/specialization — peers, never
 * "competitors" (ECOSYSTEM_LANDSCAPE framing). STACK_LABELS renders on the
 * /scorecard page AND in the generated markdown reports, and carried
 * "Competitor (ESLint)" until 2026-08-24. Internal type keys keep their
 * historical names; only reader-visible strings are constrained.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO = resolve(__dirname, '../../../..');

describe('scorecard landscape framing', () => {
  it('STACK_LABELS never says competitor', () => {
    const src = readFileSync(
      join(REPO, 'benchmarks/lib/flagship-snapshot.ts'),
      'utf-8',
    );
    const block = /STACK_LABELS = \{[\s\S]*?\} as const;/.exec(src)?.[0] ?? '';
    expect(block.length).toBeGreaterThan(0);
    // Only reader-visible label VALUES are constrained — the internal
    // `competitorEslint` key keeps its historical name on purpose.
    const values = [...block.matchAll(/: '([^']*)'/g)].map((m) => m[1]);
    expect(values.length).toBeGreaterThan(0);
    for (const v of values) expect(v).not.toMatch(/[Cc]ompetitor/);
    expect(values).toContain('Peer (ESLint)');
  });

  it('the scorecard page shows Peer columns, not Comp', () => {
    const src = readFileSync(
      join(REPO, 'apps/docs/src/app/scorecard/page.tsx'),
      'utf-8',
    );
    expect(src).toContain('>Peer cold</th>');
    expect(src).toContain('>Peer warm</th>');
    expect(src).not.toMatch(/>Comp (cold|warm)</);
  });
});
