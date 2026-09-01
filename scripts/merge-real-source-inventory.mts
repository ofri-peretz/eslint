/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Combine the partial inventories a repo-sharded scan produces.
 *
 * `real-source-scan.mts --repo-shard=i/n` clones and lints only its slice, so
 * each CI shard writes an inventory describing part of the repository list.
 * Merging them is not optional bookkeeping: a partial inventory that reached
 * `benchmarks/budgets/` unmerged would say "this rule never fired" about
 * repositories the shard never opened, which is exactly the claim the stamp on
 * that file exists to prevent.
 *
 *   npx tsx scripts/merge-real-source-inventory.mts shard-*.json
 *
 * See docs/intents/2026-09-01-every-rule-owes-a-real-code-tp.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const OUT = path.join(ROOT, 'benchmarks', 'budgets', 'real-world-rule-inventory.json');

type Rule = { count: number; repos: number; samples: string[] };
type Inventory = {
  filesLinted: number;
  filesFailed: number;
  reposScanned: number;
  suiteRules: number;
  withMaterial: number;
  withoutMaterial: number;
  rules: Record<string, Rule>;
  note: string;
  generated: string;
  configHash: string;
  reposHash: string;
};

const inputs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (inputs.length === 0) {
  console.error('usage: merge-real-source-inventory.mts <partial.json>...');
  process.exit(1);
}

const parts: Inventory[] = inputs.map(
  (f) => JSON.parse(fs.readFileSync(f, 'utf8')) as Inventory,
);

/*
 * Refuse to merge measurements that are not the same measurement.
 *
 * `configHash` decides which rules were ASKED and `reposHash` decides what
 * they were asked ABOUT. Shards that disagree on either were answering
 * different questions, and averaging them produces a number describing no
 * actual scan — the precise failure the stamp on this artifact was added for.
 */
const configHashes = new Set(parts.map((p) => p.configHash));
const reposHashes = new Set(parts.map((p) => p.reposHash));
if (configHashes.size > 1 || reposHashes.size > 1) {
  console.error(
    '\n  ⛔ shards disagree on what was measured — refusing to merge.\n' +
      `     configHash: ${[...configHashes].join(', ')}\n` +
      `     reposHash:  ${[...reposHashes].join(', ')}\n` +
      '     Re-run every shard at one commit.\n',
  );
  process.exit(1);
}

const rules: Record<string, Rule> = {};
for (const part of parts) {
  for (const [id, hit] of Object.entries(part.rules)) {
    const existing = rules[id] ?? { count: 0, repos: 0, samples: [] };
    existing.count += hit.count;
    // Repo counts are per-shard and the slices are disjoint, so they add.
    existing.repos += hit.repos;
    // A handful of samples is enough to cut a fixture from; keeping every
    // shard's would bloat the artifact for no extra evidence.
    existing.samples = [...existing.samples, ...hit.samples].slice(0, 5);
    rules[id] = existing;
  }
}

const merged: Inventory = {
  filesLinted: parts.reduce((n, p) => n + p.filesLinted, 0),
  filesFailed: parts.reduce((n, p) => n + p.filesFailed, 0),
  reposScanned: parts.reduce((n, p) => n + p.reposScanned, 0),
  suiteRules: Math.max(...parts.map((p) => p.suiteRules)),
  withMaterial: Object.keys(rules).length,
  withoutMaterial: Math.max(...parts.map((p) => p.suiteRules)) - Object.keys(rules).length,
  rules: Object.fromEntries(
    Object.entries(rules).sort((a, b) => b[1].count - a[1].count),
  ),
  note: parts[0].note,
  generated: parts[0].generated,
  configHash: parts[0].configHash,
  reposHash: parts[0].reposHash,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(merged, null, 2)}\n`);
console.log(
  `\n  merged ${parts.length} shard(s): ${merged.reposScanned} repos, ` +
    `${merged.filesLinted} files, ${merged.withMaterial} rules with material, ` +
    `${merged.withoutMaterial} without.\n`,
);
