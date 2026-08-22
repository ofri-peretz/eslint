/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace-level lock for `meta.hasSuggestions` ↔ `suggest:` parity.
 *
 * The ILB-Remediation bench (benchmarks/suites/ilb-remediation) publishes
 * `suggestionsDeclared` vs `suggestionsImplemented` per package, ours and
 * competitors' alike, and names the dead declarations on both sides. The
 * target state for our plugins is zero drift in either direction:
 *
 *   declared, not implemented — `meta.hasSuggestions: true` with no `suggest:`
 *     in the rule. `--fix`/IDE quick-fix menus advertise remediation that never
 *     arrives, and the bench counts it as a dead declaration.
 *   implemented, not declared — `suggest:` emitted without the meta flag.
 *     ESLint throws "Rules with suggestions must set the `meta.hasSuggestions`
 *     property to `true`" the moment a suggestion carries a real fixer
 *     (a suggestion whose `fix` returns null is dropped before that check,
 *     which is why this can sit latent until someone implements the fixer).
 *
 * Scans source, matching the bench's method and patterns (run.mjs RE_DECL_SUGGEST
 * / RE_IMPL_SUGGEST) so a green lock means a clean bench row.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/suggestions-meta-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PACKAGES_DIR = path.resolve(__dirname, '..', '..', 'packages');

/** Mirrors benchmarks/suites/ilb-remediation/run.mjs. */
const RE_DECL_SUGGEST = /hasSuggestions\s*:\s*true/;
const RE_IMPL_SUGGEST = /\bsuggest\s*:/;

/**
 * Drop comments before pattern matching, so prose like `// suggest: see docs`
 * can't read as an implementation.
 *
 * BLOCK comments count, and missing them was a live false positive:
 * `no-innerhtml`'s header explains why its inert suggestion was deleted, and it
 * quotes `hasSuggestions: true` while doing so. The rule declares no such thing —
 * the only occurrence in the file is that sentence — and this lock reported it as
 * declared-not-implemented. A checker matching printed source flags a rule for
 * DESCRIBING the defect it fixed, which is the same fault the ecosystem's own
 * `textual-matching` check exists to report on rules.
 *
 * Line comments are stripped only when they own the whole line — a trailing `//`
 * would eat the `https://` in a `docs.url` on the same line.
 *
 * LINE comments go first, and the order is load-bearing. With blocks stripped
 * first, a slash-star sequence INSIDE a line comment opened one: a rule whose
 * comment named a glob path matched the block opener, the scan ran on to the
 * next close-comment far below, and everything between it — including that
 * rule's own `hasSuggestions: true` — vanished. The lock then reported the rule
 * as emitting `suggest:` without declaring it.
 *
 * That is the same fault as the `no-innerhtml` case above: a rule flagged for
 * what its prose SAYS. Removing whole-line comments first means their contents
 * never tokenise at all.
 */
const stripComments = (content: string) =>
  content.replaceAll(/^[ \t]*\/\/.*$/gm, '').replaceAll(/\/\*[\s\S]*?\*\//g, '');

interface RuleSource {
  plugin: string;
  rule: string;
  file: string;
}

/**
 * Collect every rule module across the plugin packages. Both layouts in the
 * repo are covered: `src/rules/<rule>/index.ts` (security plugins) and the
 * flat `src/rules/<rule>.ts` / `src/rules/<category>/<rule>.ts` used by
 * import-next, operability and friends.
 */
function collectRuleSources(): RuleSource[] {
  const out: RuleSource[] = [];

  const walk = (plugin: string, dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(plugin, full);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      if (/\.(test|spec|d)\.ts$/.test(entry.name)) continue;
      // Rule modules only. A shared helper parked under src/rules/ has no
      // `meta:` block, and reporting it as a drifting "rule" would be noise.
      if (!/\bmeta\s*:\s*\{/.test(fs.readFileSync(full, 'utf8'))) continue;
      const rule =
        entry.name === 'index.ts' ? path.basename(dir) : entry.name.replace(/\.ts$/, '');
      out.push({ plugin, rule, file: full });
    }
  };

  for (const pkg of fs.readdirSync(PACKAGES_DIR).sort()) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    const rulesDir = path.join(PACKAGES_DIR, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    walk(pkg, rulesDir);
  }

  return out;
}

const ruleSources = collectRuleSources();

it('finds the rule sources to lock (sanity floor)', () => {
  // Ratchet floor, not an exact pin: adding rules must not break the lock,
  // a collector that silently stops finding them should.
  expect(ruleSources.length).toBeGreaterThanOrEqual(300);
});

describe('meta.hasSuggestions matches suggest: usage', () => {
  const drift = ruleSources
    .map((src) => {
      const content = stripComments(fs.readFileSync(src.file, 'utf8'));
      return {
        ...src,
        declared: RE_DECL_SUGGEST.test(content),
        implemented: RE_IMPL_SUGGEST.test(content),
      };
    })
    .filter((r) => r.declared !== r.implemented);

  it('has no rule declaring hasSuggestions without emitting suggest:', () => {
    const dead = drift
      .filter((r) => r.declared && !r.implemented)
      .map((r) => `${r.plugin}/${r.rule}`);
    expect(dead).toEqual([]);
  });

  it('has no rule emitting suggest: without declaring hasSuggestions', () => {
    const undeclared = drift
      .filter((r) => !r.declared && r.implemented)
      .map((r) => `${r.plugin}/${r.rule}`);
    expect(undeclared).toEqual([]);
  });
});

describe('stripComments', () => {
  it('does not let a comment-opener inside a line comment start a block', () => {
    // The live failure this reproduces: a rule's line comment named a glob
    // path, the slash-star in it matched the block opener, and the scan ate
    // everything down to the next close-comment — taking the rule's own
    // `hasSuggestions: true` with it.
    const glob = ['src/rest/', '*', '*'].join('');
    const src = [
      `// generated files under \`${glob}\`, whose header says so`,
      'hasSuggestions: true,',
      '*/',
      'suggest: [],',
    ].join('\n');

    const out = stripComments(src);
    expect(out).toContain('hasSuggestions: true');
    expect(RE_DECL_SUGGEST.test(out)).toBe(true);
    expect(RE_IMPL_SUGGEST.test(out)).toBe(true);
  });

  it('still strips block comments, which is what the no-innerhtml case needs', () => {
    expect(stripComments('/* hasSuggestions: true */\nconst x = 1;')).not.toContain(
      'hasSuggestions',
    );
  });

  it('leaves a trailing // alone so a docs.url on the same line survives', () => {
    expect(stripComments("url: 'https://example.com', // see docs")).toContain(
      'https://example.com',
    );
  });
});
