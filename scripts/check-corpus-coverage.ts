/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A rule with no corpus fixture has no MEASURED precision.
 *
 * Unit tests answer "does this rule behave as its author intended". They cannot
 * answer "how often is this rule wrong about real code", because the author
 * writes both the rule and the fixture. Only the benchmark corpus produces a
 * precision number, and on 2026-08-26 it exercised **62 of 374 rules (17%)**.
 *
 * The other 312 are not untested — they are unmeasured. `benchmark-results/
 * scorecard.md` already marks them `⚠️ none`. This gate stops that column
 * growing.
 *
 * ## Ratchet, not a cliff
 *
 * Requiring a fixture for all 374 rules today would block every PR. So this
 * mirrors `lint-detection-list-coverage.ts`: a committed baseline records the
 * rules known to lack corpus evidence, and the gate fails only when a rule
 * appears that is NOT in the baseline — a new rule shipped unmeasured, or an
 * existing rule that lost its fixture.
 *
 * Removing a rule from the baseline is the unit of progress. The baseline may
 * only ever shrink; `--update` rewrites it and will refuse to grow it.
 *
 * Run:
 *   npx tsx scripts/check-corpus-coverage.ts
 *   npx tsx scripts/check-corpus-coverage.ts --update   # after adding fixtures
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(ROOT, 'benchmarks', 'budgets', 'corpus-coverage-baseline.json');
const UPDATE = process.argv.includes('--update');

/** Every rule the suite ships, as `<plugin-short>/<rule>`. */
function allRules(): string[] {
  const out: string[] = [];
  const pkgDir = path.join(ROOT, 'packages');
  for (const pkg of fs.readdirSync(pkgDir).filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(rulesDir, entry.name, 'index.ts'))) {
        out.push(`${plugin}/${entry.name}`);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !/\.(test|spec)\./.test(entry.name)) {
        out.push(`${plugin}/${entry.name.replace(/\.ts$/, '')}`);
      }
    }
  }
  return out.sort();
}

/**
 * Two plugins publish under a prefix that differs from their directory, so a
 * fired ruleId will not match the directory-derived name without this.
 */
const PREFIX_ALIASES: Record<string, string> = {
  'jwt-security/': 'jwt/',
  'postgresql-security/': 'pg/',
};
const canonical = (rule: string): string => {
  for (const [dirPrefix, published] of Object.entries(PREFIX_ALIASES)) {
    if (rule.startsWith(dirPrefix)) return published + rule.slice(dirPrefix.length);
  }
  return rule;
};

/**
 * Rule ids that actually fire somewhere in the corpus.
 *
 * ESLint exits 1 whenever any file has findings, which the corpus always does —
 * its whole point is vulnerable fixtures. A non-zero exit is therefore the
 * NORMAL path and the JSON is still on stdout. Only an unparseable result means
 * the harness itself broke, and that has to be loud: treated as "no rules
 * fired" it would mark every rule unmeasured and mass-widen the baseline.
 */
function rulesWithCorpusEvidence(): Set<string> {
  let raw = '';
  try {
    raw = execFileSync(
      'npx',
      [
        'tsx',
        'node_modules/.bin/eslint',
        '--config',
        'eslint.benchmark.config.mjs',
        '--format',
        'json',
        'benchmarks/corpus/**/*.js',
      ],
      {
        cwd: ROOT,
        encoding: 'utf-8',
        env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' },
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    raw = e.stdout ?? '';
    if (!raw.trim()) {
      throw new Error(
        'corpus lint produced no output — the benchmark config or a plugin failed to load.\n' +
          String(e.stderr ?? '')
            .split('\n')
            .slice(0, 12)
            .join('\n'),
      );
    }
  }

  const fired = new Set<string>();
  for (const file of JSON.parse(raw)) {
    for (const message of file.messages ?? []) {
      if (message.ruleId) fired.add(message.ruleId);
    }
  }
  return fired;
}

const rules = allRules();
const fired = rulesWithCorpusEvidence();
const unmeasured = rules.map(canonical).filter((r) => !fired.has(r)).sort();
const measured = rules.length - unmeasured.length;
const pct = Math.round((measured / rules.length) * 100);

console.log(
  `\n${rules.length} rules · ${measured} with corpus evidence (${pct}%) · ${unmeasured.length} unmeasured\n`,
);

if (UPDATE) {
  const previous: string[] = fs.existsSync(BASELINE)
    ? JSON.parse(fs.readFileSync(BASELINE, 'utf-8')).unmeasured
    : null;
  if (previous && unmeasured.length > previous.length) {
    console.error(
      `✗ refusing to update: the baseline may only shrink.\n` +
        `  committed ${previous.length} unmeasured rules, this run found ${unmeasured.length}.\n` +
        `  Add a fixture for the new rule instead of widening the baseline.`,
    );
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(
    BASELINE,
    `${JSON.stringify({ note: 'Rules with no corpus fixture, and therefore no measured precision. May only shrink — see scripts/check-corpus-coverage.ts.', total: rules.length, measured, unmeasured }, null, 2)}\n`,
  );
  console.log(`↻ baseline written: ${unmeasured.length} unmeasured rules recorded.`);
  process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
  console.error('✗ no baseline. Run with --update to record the current state.');
  process.exit(1);
}

const baseline: string[] = JSON.parse(fs.readFileSync(BASELINE, 'utf-8')).unmeasured;
const known = new Set(baseline);
const regressed = unmeasured.filter((r) => !known.has(r));
const improved = baseline.filter((r) => !unmeasured.includes(r));

if (improved.length > 0) {
  console.log(`✓ ${improved.length} rule(s) gained corpus evidence since the baseline:`);
  for (const r of improved) console.log(`    ${r}`);
  console.log(`  Run with --update to bank the progress.\n`);
}

if (regressed.length === 0) {
  console.log('✅ No rule shipped without corpus evidence.\n');
  process.exit(0);
}

console.error(`✗ ${regressed.length} rule(s) have no corpus fixture and are not in the baseline:\n`);
for (const r of regressed) console.error(`    ${r}`);
console.error(
  `\n  A rule with no fixture has no measured precision — it can be wrong about real\n` +
    `  code indefinitely and no number will move. Add a vulnerable and a safe fixture\n` +
    `  under benchmarks/corpus/CWE-NNN/, then re-run.\n`,
);
process.exit(1);
