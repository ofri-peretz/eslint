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
      const content = fs.readFileSync(src.file, 'utf8');
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
