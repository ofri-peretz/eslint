#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License.
 */

/**
 * codemod-mjs-to-ts — bulk-rename .mjs build/dev scripts to .ts so the
 * repo follows a single convention (tsx for everything that isn't a
 * framework config file).
 *
 * Safe set (converted):
 *   scripts/*.mjs                          — repo build/dev scripts
 *   benchmarks/lib/*.mjs                   — bench library helpers
 *   benchmarks/score.mjs                   — bench top-level scorer
 *   benchmarks/suites/* /run.mjs           — bench runners
 *   benchmarks/suites/ilb-flagship/scorecard.mjs
 *   benchmarks/suites/ilb-oxlint-parity/harvest-fixtures.mjs
 *
 * NOT converted (framework / build-output / package-entry constraints):
 *   eslint.config*.mjs                     — ESLint flat config (legacy interop)
 *   *.config.mjs (next/postcss/tailwind/commitlint/stryker/source)
 *   apps/docs/.next/standalone/**          — Next.js build output
 *   apps/docs/.source/**                   — Fumadocs generated
 *   packages/* /src/index.mjs              — package main entries
 *   packages/eslint-plugin-* /benchmark/eslint.config*.mjs
 *
 * Per-file transform:
 *   1. Replace shebang `#!/usr/bin/env node` with `#!/usr/bin/env -S npx tsx`
 *      (or insert one if missing).
 *   2. Insert `// @ts-nocheck — converted from .mjs; type incrementally.`
 *      at the top so the file participates in tsx runtime without
 *      tripping the repo's strict tsconfig before someone has time
 *      to add proper annotations.
 *   3. Write to the .ts path; delete the .mjs.
 *
 * Usage:
 *   tsx scripts/codemod-mjs-to-ts.ts            # dry-run (default)
 *   tsx scripts/codemod-mjs-to-ts.ts --apply    # write changes
 */

import { readdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

// ---------------------------------------------------------------------------
// SCOPE
// ---------------------------------------------------------------------------

interface ScopeRule {
  /** Glob-like prefix this rule applies to (relative to repo root). */
  dir: string;
  /** Optional file basename allow-list; if present, only these basenames convert. */
  allow?: (basename: string) => boolean;
}

const CONVERT_SCOPE: ScopeRule[] = [
  // Repo-level scripts.
  { dir: 'scripts', allow: name => name.endsWith('.mjs') },
  // Bench library helpers.
  { dir: 'benchmarks/lib', allow: name => name.endsWith('.mjs') },
  // Top-level bench scorer.
  { dir: 'benchmarks', allow: name => name === 'score.mjs' },
];

/**
 * Bench suite runners + scorecard helpers — anything under
 * `benchmarks/suites/<suite>/` named `run.mjs`, `scorecard.mjs`, or
 * `harvest-fixtures.mjs`. Hand-listed to avoid sweeping in
 * `eslint.config.*.mjs` files used as ESLint flat-config fixtures.
 */
const SUITE_RUNNERS_BASENAMES = new Set(['run.mjs', 'scorecard.mjs', 'harvest-fixtures.mjs']);

function listSuiteRunners(): string[] {
  const suitesDir = join(REPO_ROOT, 'benchmarks/suites');
  const out: string[] = [];
  let entries;
  try { entries = readdirSync(suitesDir, { withFileTypes: true }); }
  catch { return out; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const suiteDir = join(suitesDir, entry.name);
    for (const f of readdirSync(suiteDir)) {
      if (SUITE_RUNNERS_BASENAMES.has(f)) {
        out.push(join(suiteDir, f));
      }
    }
  }
  return out;
}

function listFromScope(rule: ScopeRule): string[] {
  const dir = join(REPO_ROOT, rule.dir);
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (rule.allow && !rule.allow(entry.name)) continue;
    out.push(join(dir, entry.name));
  }
  return out;
}

function collectInScope(): string[] {
  const out: string[] = [];
  for (const rule of CONVERT_SCOPE) out.push(...listFromScope(rule));
  out.push(...listSuiteRunners());
  return out.toSorted();
}

// ---------------------------------------------------------------------------
// PER-FILE TRANSFORM
// ---------------------------------------------------------------------------

const TS_NOCHECK = '// @ts-nocheck — converted from .mjs; type incrementally.\n';
const SHEBANG_OLD = '#!/usr/bin/env node';
const SHEBANG_NEW = '#!/usr/bin/env -S npx tsx';

function transformContent(source: string): string {
  // Split off shebang (if present) so we can keep it on line 1.
  const lines = source.split('\n');
  const hasShebang = lines[0]?.startsWith('#!');
  if (hasShebang) {
    const newShebang = lines[0]!.includes('node')
      ? lines[0]!.replace(SHEBANG_OLD, SHEBANG_NEW).replace(/^#!\S+node\b.*$/, SHEBANG_NEW)
      : lines[0]!;
    return `${newShebang}\n${TS_NOCHECK}${lines.slice(1).join('\n')}`;
  }
  return `${TS_NOCHECK}${source}`;
}

function tsPathFor(mjsPath: string): string {
  return mjsPath.replace(/\.mjs$/, '.ts');
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function main(): void {
  const files = collectInScope();
  console.log(`codemod-mjs-to-ts (${APPLY ? 'APPLY' : 'DRY-RUN'}):`);
  console.log(`  candidates: ${files.length}`);
  console.log('');

  let converted = 0;
  let skippedExists = 0;
  for (const mjs of files) {
    const ts = tsPathFor(mjs);
    const rel = relative(REPO_ROOT, mjs);
    try {
      statSync(ts);
      console.log(`  SKIP (target exists)  ${rel}`);
      skippedExists++;
      continue;
    } catch {
      // Doesn't exist — proceed.
    }
    const source = readFileSync(mjs, 'utf8');
    const transformed = transformContent(source);
    if (APPLY) {
      writeFileSync(ts, transformed, 'utf8');
      rmSync(mjs);
    }
    console.log(`  ${APPLY ? 'CONVERT' : 'WOULD'}  ${rel} → ${relative(REPO_ROOT, ts)}`);
    converted++;
  }
  console.log('');
  console.log(`  converted:        ${converted}`);
  console.log(`  skipped (target exists): ${skippedExists}`);
  if (!APPLY) {
    console.log('');
    console.log('Dry-run only. Re-run with --apply to write changes.');
  }
}

main();
