/**
 * Lock: every figure on "Use alongside eslint-plugin-security" is recomputed from
 * the result file the page cites, so the page cannot drift from its evidence.
 *
 * Proven by changing "Found by Interlace only | 74" to 75 on the page: this fails.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const PAGE = join(
  ROOT,
  'apps/docs/content/docs/getting-started/with-eslint-plugin-security.mdx',
);

type Fixture = {
  file: string;
  expectedVulnerable: boolean;
  findings: number;
  ruleHits: Record<string, number>;
};
type Plugin = {
  displayName: string;
  perCwe: Record<string, { fixtures: Fixture[] }>;
};

const page = readFileSync(PAGE, 'utf8');
const cited =
  /benchmarks\/results\/ilb-cwe-corpus\/(\d{4}-\d{2}-\d{2})\.json/.exec(
    page,
  )?.[0];
const result = JSON.parse(
  readFileSync(join(ROOT, cited ?? 'missing'), 'utf8'),
) as {
  plugins: Record<string, Plugin>;
};
const ours = result.plugins['interlace'];
const theirs = result.plugins['eslint-plugin-security'];

const counts = {
  oursOnly: 0,
  both: 0,
  theirsOnly: 0,
  neither: 0,
  vulnerable: 0,
  safe: 0,
  oursFp: 0,
  theirsFp: 0,
};
const perPlugin: Record<string, number> = {};
for (const [cwe, { fixtures }] of Object.entries(ours.perCwe)) {
  for (const o of fixtures) {
    const t = theirs.perCwe[cwe].fixtures.find((f) => f.file === o.file)!;
    if (!o.expectedVulnerable) {
      counts.safe++;
      if (o.findings) counts.oursFp++;
      if (t.findings) counts.theirsFp++;
      continue;
    }
    counts.vulnerable++;
    if (o.findings && t.findings) counts.both++;
    else if (t.findings) counts.theirsOnly++;
    else if (!o.findings) counts.neither++;
    else {
      counts.oursOnly++;
      for (const p of new Set(
        Object.keys(o.ruleHits).map((r) => r.split('/')[0]),
      )) {
        perPlugin[p] = (perPlugin[p] ?? 0) + 1;
      }
    }
  }
}

/** A table row "| label | n |", whatever the column padding. */
const row = (label: string, n: number) =>
  new RegExp(
    `\\|\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*${n}\\s*\\|`,
  );

describe('the alongside page matches its cited run', () => {
  it('cites a committed result file', () => {
    expect(cited).toBeDefined();
  });

  it('states the corpus size', () => {
    expect(page).toContain(
      `${counts.vulnerable} vulnerable and ${counts.safe} safe`,
    );
  });

  it('states the overlap table', () => {
    expect(page).toMatch(row('Found by Interlace only', counts.oursOnly));
    expect(page).toMatch(row('Found by both', counts.both));
    expect(page).toMatch(
      row('Found by `eslint-plugin-security` only', counts.theirsOnly),
    );
    expect(page).toMatch(row('Found by neither', counts.neither));
  });

  it('states the safe samples each one flagged', () => {
    expect(page).toMatch(row('Interlace', counts.oursFp));
    expect(page).toMatch(row('`eslint-plugin-security`', counts.theirsFp));
  });

  it.each(Object.entries(perPlugin))('states what %s found', (plugin, n) => {
    expect(page).toMatch(
      new RegExp(`\\[\`${plugin}\`\\]\\([^)]+\\)\\s*\\|\\s*${n}\\s*\\|`),
    );
  });
});
