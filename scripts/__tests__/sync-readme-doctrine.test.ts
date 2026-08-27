/**
 * Locks for the generated doctrine block in scripts/sync-readme-rules.ts.
 *
 * The doctrine is ecosystem-wide, so it is generated into every plugin README rather
 * than hand-copied. Thirty hand-maintained copies of one position drift, and a doctrine
 * that says different things in different packages is not a doctrine.
 *
 * What each case defends:
 *   - the block adds NO headings and stays short. The first version carried three `##`
 *     sections and ~45 lines, which pushed Getting Started and the rule table below the
 *     fold on all thirty READMEs. A reader came for the install command; doctrine that
 *     costs them the install command is an essay. The line cap is the lock — prose can
 *     be rewritten freely underneath it, it just cannot grow back into an essay.
 *   - `## Philosophy` is REPLACED, not preserved. It held the sell slot in thirty
 *     READMEs with three sentences a reader could neither act on nor disagree with,
 *     directly above the doctrine that said the same thing with substance.
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
  it('replaces Philosophy rather than sitting under it', () => {
    const { content, modified } = spliceDoctrine(withPhilosophy);

    expect(modified).toBe(true);
    // Philosophy is GONE. Keeping it meant paying twice for one slot: three sentences
    // of "resilient fabric of code" directly above the block that says the same thing
    // with substance.
    expect(content).not.toContain('## Philosophy');
    expect(content).not.toContain('**Interlace** fosters **strength through integration**.');
    expect(content).toContain('## Why these rules are quiet');
    expect(content).toContain('## How they decide');
    expect(content).toContain('## What you get');
    expect(content).toContain('BENCHMARK-METHODOLOGY.md');
    // The block lands between Philosophy and the rules table, not at the end.
    expect(content.indexOf('## Philosophy')).toBeLessThan(content.indexOf('DOCTRINE:START'));
    expect(content.indexOf('DOCTRINE:END')).toBeLessThan(content.indexOf('| Rule | Description |'));
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

  /** The generated block only, markers excluded. */
  function doctrineBlock(): string {
    const { content } = spliceDoctrine(withPhilosophy);
    const start = content.indexOf('AUTO-GENERATED:DOCTRINE:START');
    return content.slice(
      content.indexOf('-->', start) + 3,
      content.indexOf('<!-- AUTO-GENERATED:DOCTRINE:END'),
    );
  }

  it('carries exactly the three why/how/what beats and no other heading', () => {
    // The golden circle is the shape, and only the shape. A fourth section is how the
    // ~45-line version grew, one reasonable-looking addition at a time.
    const headings = doctrineBlock().match(/^#{1,6} .*$/gm) ?? [];
    expect(headings).toEqual([
      '## Why these rules are quiet',
      '## How they decide',
      '## What you get',
    ]);
  });

  it('stays short enough that the install command survives the fold', () => {
    // ~26 is the current block plus headroom to rewrite it, not a target to fill. The
    // shape this defends against is the three-section, ~45-line version that pushed
    // Getting Started and the rule table off the first screen on all thirty READMEs.
    const lines = doctrineBlock().trim().split('\n');
    expect(lines.length).toBeLessThanOrEqual(30);
  });

  it('opens every beat with a bolded claim, so it survives skimming', () => {
    const beats = doctrineBlock()
      .split(/^## /m)
      .slice(1)
      .map((b) => b.split('\n').slice(1).join('\n').trim());
    expect(beats).toHaveLength(3);
    for (const beat of beats) expect(beat.startsWith('**')).toBe(true);
  });

  it('carries no ecosystem totals', () => {
    const block = doctrineBlock();
    // No bare counts — "121 rules", "76/76", "0/67" and friends.
    expect(block).not.toMatch(/\b\d+\s*\/\s*\d+\b/);
    expect(block).not.toMatch(/\b\d{2,}\s+rules\b/);
  });
});
