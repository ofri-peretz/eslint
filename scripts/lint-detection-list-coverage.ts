/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every entry in a rule's detection table is a CLAIM. This gate asks whether
 * anything ever exercised it.
 *
 * The failure it exists to stop, from #659: twelve credential spellings were
 * added to `no-weak-hash-algorithm`'s name table and three of them —
 * `totp`, `recoverycode`, `backupcode` — reached the PR with no test case.
 * Removing all three from the rule left the suite **green**. A quarter of that
 * change's recall claim rested on nothing, and no gate in the repo could tell.
 *
 * Measured across the plugins the first time this ran: 78 detection tables,
 * 762 entries, **347 of them (46%) appearing in no test at all**.
 *
 * ## What this proves, and what it does NOT
 *
 * The check is a substring match against the test sources beside the rule.
 * That is deliberately the FLOOR, not proof of coverage:
 *
 *   - it catches "this entry is mentioned nowhere", which is the #659 defect;
 *   - it does NOT prove a test asserts the rule REPORTS on the entry. An entry
 *     named only in a `valid` fixture passes.
 *
 * The second gap is real and has already bitten. `totpSecret` looks like a
 * perfect case for `totp` — and `secret` is separately in the same table, so
 * the case reports whether or not `totp` was ever added. Appearance is not
 * evidence; only a case that fails when the entry is removed is evidence.
 * Closing that properly means mutation (drop the entry, expect a red suite),
 * which is too slow for a per-push gate. This gate is the cheap half, and it
 * is written down here so nobody reads a green run as "the table is covered".
 *
 * ## Ratchet
 *
 * `.agent/detection-list-coverage-debt.json` records what is uncovered today.
 * The build fails on a NEW uncovered entry, and equally on a debt entry that
 * is now covered — a ledger nobody prunes stops describing the repo, which is
 * the same bidirectional shape `lint:severity-consistency` uses.
 *
 *   npm run lint:detection-list-coverage
 *   npm run lint:detection-list-coverage -- --update
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const PACKAGES = path.join(ROOT, 'packages');
const DEBT_FILE = path.join(ROOT, '.agent', 'detection-list-coverage-debt.json');

/**
 * A detection entry is a bare token — a method name, a package name, a route
 * fragment. Prose is not: the same array syntax also holds message text and
 * remediation advice, and counting those produced a first reading of 597
 * uncovered "entries" that included "Moment.js is in maintenance mode" and
 * "10-15 minutes". Requiring no whitespace is what separates the two.
 */
export const isDetectionToken = (value: string): boolean =>
  /^[A-Za-z0-9@._/-]{2,40}$/.test(value);

/** A table is a detection table when it is overwhelmingly tokens. */
const TOKEN_RATIO = 0.8;
/** Below this a table is a handful of special cases, not a claim surface. */
const MIN_ENTRIES = 5;

export interface DetectionList {
  file: string;
  name: string;
  entries: string[];
}

/**
 * Pull `const UPPER_NAME = [ 'a', 'b', … ]` tables out of a rule source.
 *
 * Regex rather than AST on purpose: it runs over ~600 files on every push, it
 * needs no type information, and a table it fails to see costs a missed claim
 * rather than a false failure. The repo's rule against regexing PRINTED SOURCE
 * governs what a RULE may do to user code — this is a repo gate reading our
 * own sources, and it reports on tables, never on user findings.
 */
/**
 * Drop comments before any quote pairing. This is not tidiness — without it
 * this gate silently skipped the very table that motivated it.
 *
 * `DEFAULT_SECURITY_USE_NAMES` carries an explanatory comment BETWEEN its
 * entries, and that comment contains an apostrophe (`makeNameTest`'s). The
 * apostrophe pairs with the next entry's opening quote, so four lines of prose
 * were captured as a "string literal", the token ratio fell to 0.73, and the
 * 41-entry table fell below the threshold and was never checked. The gate
 * reported a clean run over the exact list whose gaps prompted it.
 *
 * LINE comments first, and the order is load-bearing for the same reason it is
 * in `suggestions-meta-lock`: a slash-star sequence inside a line comment
 * opens a block that swallows everything to the next close-comment.
 */
export const stripComments = (source: string): string =>
  source
    .replaceAll(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(stripLineComment)
    .join('\n');

/**
 * Truncate a line at the first `//` that is not inside a string literal.
 *
 * Whole-line stripping was not enough: TypeScript allows a comment AFTER an
 * entry, and an apostrophe in one corrupts quote pairing exactly as the
 * between-entries case did. Truncating at any `//` is not enough either — that
 * eats the `//` in a `docs.url`, and `suggestions-meta-lock` documents that
 * exact regression. Tracking quotes is what distinguishes them.
 */
function stripLineComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

export function extractLists(rawSource: string, file: string): DetectionList[] {
  const source = stripComments(rawSource);
  const out: DetectionList[] = [];
  for (const m of source.matchAll(/const\s+([A-Z][A-Z0-9_]{2,})\s*(?::[^=]+)?=\s*\[([^\]]*)\]/g)) {
    const all = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    const tokens = all.filter(isDetectionToken);
    if (tokens.length < MIN_ENTRIES) continue;
    if (tokens.length / all.length < TOKEN_RATIO) continue;
    out.push({ file, name: m[1], entries: tokens });
  }
  return out;
}

/** Entries of `list` that appear nowhere in `testText`. Case-insensitive. */
export function uncoveredEntries(list: DetectionList, testText: string): string[] {
  const haystack = testText.toLowerCase();
  return list.entries.filter((e) => !haystack.includes(e.toLowerCase()));
}

const isRuleSource = (name: string) =>
  name.endsWith('.ts') && !/\.(test|spec|d)\.ts$/.test(name);

function collectListsUnder(dir: string): DetectionList[] {
  const out: DetectionList[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectListsUnder(full));
      continue;
    }
    if (!isRuleSource(entry.name)) continue;
    out.push(...extractLists(fs.readFileSync(full, 'utf8'), full));
  }
  return out;
}

/**
 * The tests for THIS rule, and only this rule.
 *
 * Both layouts in the repo are covered, and the difference matters:
 *
 *   `src/rules/<rule>/index.ts` — the rule owns its directory, so every test
 *      under it belongs to it. Recurse.
 *   `src/rules/<rule>.ts` (and `src/rules/<cat>/<rule>.ts`) — the rule is a
 *      flat file among siblings. Recursing from its dirname would read every
 *      test in `src/rules`, and a token in ANOTHER rule's test would mark this
 *      rule's entry covered. Match by the rule's own basename instead.
 *
 * Getting this wrong makes coverage look better than it is, which is the one
 * direction this gate must never fail in.
 */
export function testTextFor(file: string): string {
  const dir = path.dirname(file);
  const base = path.basename(file, '.ts');
  let text = '';

  const readTestsUnder = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        readTestsUnder(full);
        continue;
      }
      if (/\.(test|spec)\.tsx?$/.test(entry.name)) text += fs.readFileSync(full, 'utf8');
    }
  };

  if (base === 'index') {
    readTestsUnder(dir);
    return text;
  }

  // Flat rule: `<rule>.test.ts`, `<rule>.coverage.test.ts`, and a `__tests__`
  // sibling holding `<rule>.test.ts`.
  const owns = (name: string) =>
    new RegExp(`^${base.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.[^/]*\\.(test|spec)\\.tsx?$|^${base.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(test|spec)\\.tsx?$`).test(
      name,
    );
  for (const d of [dir, path.join(dir, '__tests__')]) {
    if (!fs.existsSync(d)) continue;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      if (owns(entry.name)) text += fs.readFileSync(path.join(d, entry.name), 'utf8');
    }
  }
  return text;
}

const keyOf = (list: DetectionList) =>
  `${path.relative(ROOT, list.file)}#${list.name}`;

function main(): void {
  const update = process.argv.includes('--update');

  const lists: DetectionList[] = [];
  for (const pkg of fs.readdirSync(PACKAGES).sort()) {
    if (!pkg.startsWith('eslint-plugin-')) continue;
    const rulesDir = path.join(PACKAGES, pkg, 'src', 'rules');
    if (fs.existsSync(rulesDir)) lists.push(...collectListsUnder(rulesDir));
  }

  const current: Record<string, string[]> = {};
  let entryCount = 0;
  for (const list of lists) {
    entryCount += list.entries.length;
    const missing = uncoveredEntries(list, testTextFor(list.file));
    if (missing.length) current[keyOf(list)] = missing.sort();
  }

  if (update) {
    fs.mkdirSync(path.dirname(DEBT_FILE), { recursive: true });
    fs.writeFileSync(DEBT_FILE, `${JSON.stringify(current, null, 2)}\n`);
    const total = Object.values(current).reduce((a, e) => a + e.length, 0);
    console.log(`Recorded ${total} uncovered entries across ${Object.keys(current).length} tables.`);
    return;
  }

  const debt: Record<string, string[]> = fs.existsSync(DEBT_FILE)
    ? JSON.parse(fs.readFileSync(DEBT_FILE, 'utf8'))
    : {};

  const added: string[] = [];
  const fixed: string[] = [];
  for (const [key, missing] of Object.entries(current)) {
    const known = new Set(debt[key] ?? []);
    for (const entry of missing) if (!known.has(entry)) added.push(`${key} → ${entry}`);
  }
  for (const [key, known] of Object.entries(debt)) {
    const missing = new Set(current[key] ?? []);
    for (const entry of known) if (!missing.has(entry)) fixed.push(`${key} → ${entry}`);
  }

  const totalUncovered = Object.values(current).reduce((a, e) => a + e.length, 0);
  console.log(
    `${lists.length} detection tables, ${entryCount} entries, ${totalUncovered} uncovered.`,
  );

  if (added.length) {
    console.error(`\n✗ ${added.length} detection entry/entries no test exercises:\n`);
    for (const line of added) console.error(`    ${line}`);
    console.error(
      '\n  Add a case that FAILS when the entry is removed from the table.\n' +
        '  Beware a case that passes for another reason — `totpSecret` covers\n' +
        '  `secret`, not `totp`, when both are in the same table.\n',
    );
  }
  if (fixed.length) {
    console.error(`\n✗ ${fixed.length} debt entry/entries are now covered — prune the ledger:\n`);
    for (const line of fixed) console.error(`    ${line}`);
    console.error('\n  Run: npm run lint:detection-list-coverage -- --update\n');
  }
  if (added.length || fixed.length) process.exit(1);
  console.log('✅ No new unexercised detection entries.');
}

if (require.main === module) main();
