/**
 * Locks for the generated doctrine block in scripts/sync-readme-rules.ts.
 *
 * The why/how/what block is ecosystem-wide, so it is generated into every plugin README
 * rather than hand-copied. Thirty hand-maintained copies of one position drift, and a
 * doctrine that says different things in different packages is not a doctrine.
 *
 * What each case defends:
 *   - `## Philosophy` SURVIVES. It is the brand statement and `readme-structure-lock`
 *     requires it verbatim; the first version of this replaced it and turned that gate
 *     red across 26 READMEs.
 *   - a second run is a no-op. The markers exist so re-syncing is idempotent; if it were
 *     not, every `sync-readmes` run would produce a diff and the gate would be useless.
 *   - a README with neither marker nor Philosophy is left ALONE. Guessing where the block
 *     belongs in a structure the script does not recognise is worse than doing nothing.
 *   - no ecosystem totals leak in. BENCHMARK-PUBLISHING-PLAN.md §1: rule counts in a
 *     plugin README read as inflated the moment someone counts the table below them.
 */
import { describe, it, expect } from 'vitest';
import { spliceDoctrine } from '../sync-readme-rules';

const withPhilosophy = [
  '# eslint-plugin-example',
  '',
  '## Description',
  '',
  'Rules for things.',
  '',
  '## Philosophy',
  '',
  '**Interlace** fosters **strength through integration**.',
  '',
  '## Rules',
  '',
  '| Rule | Description |',
].join('\n');

describe('spliceDoctrine', () => {
  it('inserts after Philosophy without removing it', () => {
    const { content, modified } = spliceDoctrine(withPhilosophy);

    expect(modified).toBe(true);
    // The structure gate requires this section verbatim — it must survive.
    expect(content).toContain('## Philosophy');
    expect(content).toContain('**Interlace** fosters **strength through integration**.');
    expect(content).toContain('## Why these rules are quiet');
    expect(content).toContain('## How the rules decide');
    expect(content).toContain('## What you get');
    // The block lands between Philosophy and the rules table, not at the end.
    expect(content.indexOf('## Philosophy')).toBeLessThan(content.indexOf('## Why these rules are quiet'));
    expect(content.indexOf('## What you get')).toBeLessThan(content.indexOf('| Rule | Description |'));
    expect(content).toContain('## Description');
  });

  it('is idempotent — a second run changes nothing', () => {
    const once = spliceDoctrine(withPhilosophy).content;
    const twice = spliceDoctrine(once);

    expect(twice.modified).toBe(false);
    expect(twice.content).toBe(once);
  });

  it('leaves a README with neither marker nor Philosophy alone', () => {
    const plain = '# eslint-plugin-example\n\n## Rules\n\n| Rule | Description |\n';
    const { content, modified } = spliceDoctrine(plain);

    expect(modified).toBe(false);
    expect(content).toBe(plain);
  });

  it.each([
    ['START with no END', '<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->', /without a matching END/],
    ['END with no START', '<!-- AUTO-GENERATED:DOCTRINE:END -->', /without a matching START/],
    [
      'END before START',
      '<!-- AUTO-GENERATED:DOCTRINE:END -->\n\n<!-- AUTO-GENERATED:DOCTRINE:START - Do not edit manually -->',
      /END appears before/,
    ],
  ])('throws on %s rather than corrupting the file', (_label, markers, expected) => {
    // Each broken shape corrupts differently if waved through: an END before START runs
    // the second slice backwards over the block, and an orphan END is left behind a
    // freshly inserted one.
    expect(() => spliceDoctrine(`# x\n\n${markers}\n\n## Rules\n`)).toThrow(expected);
  });

  it('carries no ecosystem totals', () => {
    const { content } = spliceDoctrine(withPhilosophy);
    const block = content.slice(
      content.indexOf('## Why these rules are quiet'),
      content.indexOf('AUTO-GENERATED:DOCTRINE:END'),
    );
    // No bare counts — "121 rules", "76/76", "0/67" and friends.
    expect(block).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
    expect(block).not.toMatch(/\b\d{2,}\s+rules\b/);
  });
});
