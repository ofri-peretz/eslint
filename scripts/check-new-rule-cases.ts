#!/usr/bin/env tsx

/**
 * check-new-rule-cases.ts — Stage 2 of `AI_SDLC.md`, enforced for NEW rules.
 *
 * ## The hole this closes
 *
 * `CASE_PHILOSOPHY.md` says the design artifact for a rule is an executable
 * claim: an entry in `benchmarks/cases/registry.json` under a permanent
 * `ILB-nnnn` id, written and verified FAILING before `create()` is written.
 *
 * Nothing enforced it. `check:case-registry` ratchets the set of VERIFIED
 * cases — it cannot notice a rule that never had one. `check:rule-cases`
 * requires three RuleTester cases a side, which proves the rule matches some
 * strings, not that anyone stated what defect it exists to catch.
 *
 * The measurable consequence: **27 of 470 rules have a registry case.** The
 * stage the whole case-first method rests on holds for 6% of the suite.
 *
 * ## Ratchet, not retrofit
 *
 * Writing 443 registry entries is not work anybody finishes, so this does not
 * ask for it. It asks that rule 471 arrives with one. Same strategy as the 843
 * spelling sites and the 14,935 undescribed cases: refuse the next one, let
 * the backlog drain opportunistically.
 *
 * ## Why the manifest and not the filesystem
 *
 * A rule directory also holds helpers, and a helper is not a rule.
 * `.agent/plugin-rule-manifest.json` is the generated list of what each plugin
 * actually exports, and it is committed — so "new rule" is a diff of that file
 * between the merge base and HEAD, not a guess from filenames.
 *
 * Usage:
 *   tsx scripts/check-new-rule-cases.ts [--since=origin/main] [--strict] [--json]
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');
const MANIFEST = '.agent/plugin-rule-manifest.json';

function arg(flag: string): string | undefined {
  const found = process.argv.slice(2).find((a) => a.startsWith(`${flag}=`));
  return found ? found.slice(flag.length + 1) : undefined;
}

const STRICT = process.argv.includes('--strict');
const JSON_OUT = process.argv.includes('--json');
const BASE = arg('--since') ?? 'origin/main';

function git(args: string[]): string {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  return execFileSync('git', args, {
    encoding: 'utf8',
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

type Manifest = Record<string, Record<string, unknown>>;

/** Every published rule id (`plugin/rule`) in a manifest blob. */
export function ruleIds(manifest: Manifest): Set<string> {
  const out = new Set<string>();
  for (const [pkg, rules] of Object.entries(manifest)) {
    const plugin = pkg.replace(/^eslint-plugin-/, '');
    for (const rule of Object.keys(rules)) out.add(`${plugin}/${rule}`);
  }
  return out;
}

/**
 * The manifest as of `ref`, or `null` if it did not exist there.
 *
 * `null` is not "no rules" — that would read every rule in the suite as new
 * and fail a branch for four hundred rules it did not write. A manifest we
 * cannot read is a reason to say nothing, not a reason to say everything.
 */
function manifestAt(ref: string): Manifest | null {
  try {
    return JSON.parse(git(['show', `${ref}:${MANIFEST}`])) as Manifest;
  } catch {
    return null;
  }
}

/** Rules the case registry covers, from every case's `coverage[]`. */
function rulesWithACase(): Set<string> {
  const parsed = JSON.parse(readFileSync(REGISTRY, 'utf8')) as
    | { cases?: Array<{ coverage?: Array<{ rule: string }> }> }
    | Array<{ coverage?: Array<{ rule: string }> }>;
  const cases = Array.isArray(parsed) ? parsed : (parsed.cases ?? []);
  const out = new Set<string>();
  for (const entry of cases) {
    for (const coverage of entry.coverage ?? []) out.add(coverage.rule);
  }
  return out;
}

let mergeBase: string;
try {
  mergeBase = git(['merge-base', BASE, 'HEAD']);
} catch {
  console.error(
    `❌ No merge base with ${BASE} — cannot tell which rules are new.`,
  );
  console.error(
    `   Try \`git fetch origin ${BASE.replace(/^origin\//, '')}\`.`,
  );
  process.exit(1);
}

const before = manifestAt(mergeBase);
const after = manifestAt('HEAD');

if (before === null || after === null) {
  console.log(
    `✅ No rule manifest at ${before === null ? mergeBase.slice(0, 8) : 'HEAD'} — nothing to compare.`,
  );
  process.exit(0);
}

const covered = rulesWithACase();
const existing = ruleIds(before);
const added = [...ruleIds(after)].filter((r) => !existing.has(r)).sort();
const uncovered = added.filter((r) => !covered.has(r));

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { base: mergeBase, added, uncovered, covered: covered.size },
      null,
      2,
    ),
  );
  process.exit(uncovered.length > 0 && STRICT ? 1 : 0);
}

if (added.length === 0) {
  console.log('✅ No new rules on this branch.');
} else if (uncovered.length === 0) {
  console.log(`✅ ${added.length} new rule(s), each with a registry case.`);
} else {
  console.warn(
    `⚠️  ${uncovered.length} new rule(s) arrived with no registry case:`,
  );
  console.warn('');
  for (const rule of uncovered) console.warn(`   - ${rule}`);
  console.warn('');
  console.warn(
    '   A rule needs a case that states the defect it exists to catch —',
  );
  console.warn(
    '   an `ILB-nnnn` entry in benchmarks/cases/registry.json naming this rule',
  );
  console.warn(
    '   in its `coverage[]`, verified FAILING before the rule was written.',
  );
  console.warn('   See CASE_PHILOSOPHY.md.');
  if (STRICT) process.exit(1);
}

console.log(
  `   (${covered.size} of the suite's rules carry a registry case — this gate only guards new ones)`,
);
