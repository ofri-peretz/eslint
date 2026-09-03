/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * limits.mts — "did I reach this limit before, and where?"
 *
 * A rule stops improving for one of two reasons: something nobody has done yet,
 * or a property of single-file AST analysis that no amount of work removes.
 * Telling those apart is the whole difference between finishing a rule and
 * grinding on it, and the answer is not memorable across sessions — which is
 * why it is written down per gap and queried here rather than re-derived.
 *
 * Reads every SEAL.json `knownGaps[]` and rolls them up by the limit they cite
 * in ANALYSIS-LIMITS.md.
 *
 *   npm run limits            # the whole picture, most-cited first
 *   npm run limits -- L1      # every gap citing L1 — the "was I here before" query
 *   npm run limits -- --open  # gaps citing NO limit: the actual backlog
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'benchmarks/rule-corpus');

const registry = new Map(
  [...fs.readFileSync(path.join(ROOT, 'ANALYSIS-LIMITS.md'), 'utf8').matchAll(
    /^\|\s*\*\*(L\d+)\*\*\s*\|\s*\*\*([^*]+)\*\*/gm,
  )].map((m) => [m[1], m[2].trim()]),
);

type Gap = { id: string; kind: string; summary: string; why: string; reopenWhen: string; limit?: string | null };
const gaps: { rule: string; gap: Gap }[] = [];

for (const dir of fs.readdirSync(CORPUS)) {
  const file = path.join(CORPUS, dir, 'SEAL.json');
  if (!fs.existsSync(file)) continue;
  const seal = JSON.parse(fs.readFileSync(file, 'utf8')) as { rule: string; knownGaps?: Gap[] };
  for (const gap of seal.knownGaps ?? []) gaps.push({ rule: seal.rule, gap });
}

const args = process.argv.slice(2);
const wantOpen = args.includes('--open');
const wanted = args.find((a) => /^L\d+$/.test(a));

if (wanted || wantOpen) {
  const matching = gaps.filter(({ gap }) => (wantOpen ? !gap.limit : gap.limit === wanted));
  const heading = wantOpen ? 'gaps citing NO limit — open work' : `${wanted} — ${registry.get(wanted!) ?? 'unknown'}`;
  console.log(`\n${heading}\n${'─'.repeat(heading.length)}\n`);
  if (matching.length === 0) console.log('  none\n');
  for (const { rule, gap } of matching) {
    console.log(`  ${rule}`);
    console.log(`    ${gap.id} [${gap.kind}]`);
    console.log(`    ${gap.summary}`);
    console.log(`    reopen when: ${gap.reopenWhen}\n`);
  }
  process.exit(0);
}

const counts = new Map<string, number>();
for (const { gap } of gaps) counts.set(gap.limit ?? '—', (counts.get(gap.limit ?? '—') ?? 0) + 1);

console.log(`\n${gaps.length} gap(s) across ${new Set(gaps.map((g) => g.rule)).size} rule(s)\n`);
for (const [limit, count] of [...counts].sort((a, b) => b[1] - a[1])) {
  const label = limit === '—' ? 'UNCLASSIFIED — open work, not a limit' : `${limit}  ${registry.get(limit) ?? '?'}`;
  console.log(`  ${String(count).padStart(3)}  ${label}`);
}
console.log(`\n  npm run limits -- <Ln>    every gap citing that limit`);
console.log(`  npm run limits -- --open  the backlog\n`);
