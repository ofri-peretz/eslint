/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * @fileoverview Audit rules that CLASSIFY code by regexing printed source.
 *
 * A rule that runs `.test()` / `.includes()` / `.match()` over
 * `sourceCode.getText(node)` is guessing. Printed text carries identifiers,
 * comments and whitespace — everything the parser already separated out — so a
 * match proves nothing about the code's structure. Measured instances, in both
 * failure directions:
 *
 *   FALSE POSITIVES  `no-xpath-injection` matched `render.text() + input` (an
 *                    identifier) and `base /* //user[@id] *␀/ + input` (a
 *                    comment) as XPath construction.
 *   SELF-SUPPRESSION `express-security/require-route-authentication` matched
 *                    `require(...)` against its auth-middleware list, so
 *                    `app.use(require('body-parser'))` marked the file globally
 *                    authenticated and silenced EVERY route in it (#313).
 *
 * The second direction is the dangerous one: the rule scores a perfect
 * false-positive rate while protecting nothing.
 *
 * This is a RATCHET, not a gate. The existing count is baselined; the audit
 * fails only when the number grows. Burn the baseline down by replacing each
 * site with AST analysis — literal values, node types, member paths.
 *
 * Usage:
 *   npx tsx scripts/audit-gettext-classification.ts              # check
 *   npx tsx scripts/audit-gettext-classification.ts --write-baseline
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { globSync } from 'node:fs';

const REPO_ROOT = join(import.meta.dirname, '..');
const BASELINE = join(REPO_ROOT, '.agent', 'gettext-classification-baseline.json');

/** Methods that turn text into a verdict. `getText` itself is fine. */
const CLASSIFIERS = ['includes', 'match', 'startsWith', 'endsWith', 'indexOf', 'search'];

export interface Finding {
  file: string;
  line: number;
  code: string;
}

/**
 * Find lines that classify printed source.
 *
 * Two shapes: classifying the call result inline, and classifying a variable
 * that was assigned from `getText(...)` earlier in the same file.
 */
export function findClassifications(source: string): Array<{ line: number; code: string }> {
  const lines = source.split('\n');
  const textVars = new Set<string>();
  const found: Array<{ line: number; code: string }> = [];

  const assignment = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[^;]*getText\s*\(/;
  const inlineCall = new RegExp(`getText\\s*\\([^)]*\\)\\s*\\.(?:${CLASSIFIERS.join('|')})\\s*\\(`);

  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (line.startsWith('*') || line.startsWith('//')) continue;

    const assigned = assignment.exec(line);
    if (assigned?.[1] !== undefined) textVars.add(assigned[1]);

    let hit = inlineCall.test(line);
    if (!hit) {
      for (const name of textVars) {
        const classified = new RegExp(
          `\\b${name}\\b\\s*\\.(?:${CLASSIFIERS.join('|')})\\s*\\(|\\.test\\s*\\(\\s*${name}\\s*\\)`,
        );
        if (classified.test(line)) {
          hit = true;
          break;
        }
      }
    }
    if (hit) found.push({ line: index + 1, code: line.slice(0, 120) });
  }

  return found;
}

function collect(): Finding[] {
  const files = globSync('packages/eslint-plugin-*/src/**/*.ts', { cwd: REPO_ROOT }).filter(
    (f) => !f.includes('.test.') && !f.includes('.spec.'),
  );

  const findings: Finding[] = [];
  for (const file of files.sort()) {
    const source = readFileSync(join(REPO_ROOT, file), 'utf8');
    for (const hit of findClassifications(source)) {
      findings.push({ file: relative('.', file), line: hit.line, code: hit.code });
    }
  }
  return findings;
}

function main(): void {
  const findings = collect();
  const byFile = new Map<string, number>();
  for (const f of findings) byFile.set(f.file, (byFile.get(f.file) ?? 0) + 1);

  const write = process.argv.includes('--write-baseline');
  if (write) {
    writeFileSync(
      BASELINE,
      `${JSON.stringify(
        {
          $comment:
            'Ratchet: rules that classify code by regexing printed source. This number may only go DOWN. See scripts/audit-gettext-classification.ts.',
          generatedAt: null,
          total: findings.length,
          files: Object.fromEntries([...byFile].sort()),
        },
        null,
        2,
      )}\n`,
    );
    console.log(`✅ baseline written: ${findings.length} sites across ${byFile.size} files`);
    return;
  }

  if (!existsSync(BASELINE)) {
    console.error('❌ no baseline — run with --write-baseline');
    process.exit(1);
  }

  const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as {
    total: number;
    files: Record<string, number>;
  };

  console.log('══════════════════════════════════════════════════════════');
  console.log('  getText() CLASSIFICATION RATCHET');
  console.log('══════════════════════════════════════════════════════════\n');
  console.log(`  baseline: ${baseline.total} sites`);
  console.log(`  current:  ${findings.length} sites\n`);

  const grown = [...byFile]
    .filter(([file, n]) => n > (baseline.files[file] ?? 0))
    .map(([file, n]) => `${file}: ${baseline.files[file] ?? 0} → ${n}`);

  if (grown.length > 0) {
    console.error('  ❌ new printed-source classification introduced:\n');
    for (const row of grown) console.error(`     ${row}`);
    console.error('\n  Read the AST instead — literal values, node types, member paths.');
    console.error('  A regex over printed text matches identifiers and comments.\n');
    process.exit(1);
  }

  if (findings.length < baseline.total) {
    console.log(`  ✅ improved by ${baseline.total - findings.length} — re-run with`);
    console.log('     --write-baseline to lock the gain in.\n');
    return;
  }

  console.log('  ✅ no new sites.\n');
}

if (process.argv[1]?.includes('audit-gettext-classification')) main();
