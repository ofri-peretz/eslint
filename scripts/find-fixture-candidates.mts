/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * find-fixture-candidates.mts — where in a stranger's repository does a rule
 * have something to say?
 *
 * The other half of `add-sourced-fixture.mts`. That script cuts a fixture once
 * you know the coordinate; this one finds coordinates worth looking at.
 *
 * ## Using a rule to find candidates is not circular
 *
 * It would be, if the rule's verdict were then taken as the label. It is not:
 * every site printed here is a CLAIM to be adjudicated by hand, and the two
 * useful outcomes are opposite. A site you judge genuinely vulnerable becomes a
 * `vulnerable/` fixture and is evidence the rule detects real things. A site
 * you judge fine becomes a `safe/` fixture and is a standing false positive.
 * Sampling a detector's own output and adjudicating it IS how precision is
 * measured; the discipline is that the adjudication comes first and is never
 * revised to flatter the rule.
 *
 * Rules are sorted by count ASCENDING, because that is where the information
 * is. `secure-coding/no-insecure-comparison` firing 12,303 times says nothing
 * a sample can fix, while a rule firing three times in a real codebase is
 * either finding something specific or wrong in a specific way.
 *
 *   npx tsx scripts/find-fixture-candidates.mts auth0__express-openid-connect
 *   npx tsx scripts/find-fixture-candidates.mts <repo-dir> --rule secure-coding/no-sql-injection
 */

import { ESLint } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(ROOT, 'benchmarks', '.real-source-cache');

const repo = process.argv[2];
if (!repo) {
  console.error(
    '\n  usage: npx tsx scripts/find-fixture-candidates.mts <repo-dir> [--rule <plugin/rule>]\n' +
      `\n  cached repositories are in ${path.relative(ROOT, CACHE)}\n`,
  );
  process.exit(1);
}
const only = process.argv.find((a) => a.startsWith('--rule='))?.slice('--rule='.length)
  ?? (process.argv.includes('--rule') ? process.argv[process.argv.indexOf('--rule') + 1] : null);

const dir = path.join(CACHE, repo);
if (!fs.existsSync(dir)) {
  console.error(`\n  ⛔ no clone at ${path.relative(ROOT, dir)}\n`);
  process.exit(1);
}

/**
 * Rules excluded from the listing, not from the corpus.
 *
 * These fire on essentially every file — `unambiguous` on any script without
 * an import, `no-unused-modules` on anything that exports nothing — so they
 * bury the rules that have found something. Crediting them as measurement is
 * the mistake `check-corpus-coverage.ts` made twice.
 */
const INCIDENTAL =
  /^(import-next|modernization|conventions|modularity|maintainability)\//;

/** Generated code is not somebody's source, and a finding in it says nothing. */
const SKIP_DIR = /^(node_modules|\.git|dist|build|out|vendor|coverage|__snapshots__|fixtures)$/;
const MAX_FILE_BYTES = 200_000;

const files: string[] = [];
const walk = (d: string): void => {
  for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(entry.name)) walk(p);
    } else if (
      /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(entry.name) &&
      fs.statSync(p).size < MAX_FILE_BYTES
    ) {
      files.push(p);
    }
  }
};
walk(dir);

const eslint = new ESLint({
  overrideConfigFile: path.join(ROOT, 'eslint.benchmark.config.mjs'),
  errorOnUnmatchedPattern: false,
});
const results = await eslint.lintFiles(files);

const hits = new Map<string, { count: number; sites: string[] }>();
for (const result of results) {
  for (const message of result.messages) {
    if (message.ruleId === null) continue;
    if (INCIDENTAL.test(message.ruleId)) continue;
    if (only !== null && message.ruleId !== only) continue;
    const entry = hits.get(message.ruleId) ?? { count: 0, sites: [] };
    entry.count += 1;
    if (entry.sites.length < 3) {
      entry.sites.push(`${path.relative(dir, result.filePath)}:${message.line}`);
    }
    hits.set(message.ruleId, entry);
  }
}

console.log(`\n${repo} — ${files.length} files\n`);
for (const [rule, { count, sites }] of [...hits].sort((a, b) => a[1].count - b[1].count)) {
  console.log(`  ${String(count).padStart(6)}  ${rule}`);
  for (const site of sites) console.log(`          ${site}`);
}
console.log(
  '\n  Fewest first: a rule firing three times has found something specific,' +
    '\n  or is wrong in a specific way. Adjudicate the site, THEN cut it with' +
    '\n  scripts/add-sourced-fixture.mts.\n',
);
