/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A RATCHET over scripts/rule-audit.ts. Quality may improve; it may not regress.
 *
 * WHY A RATCHET AND NOT "ZERO FINDINGS"
 *
 * There are ~150 established defects today. A gate demanding zero would be red
 * for months, and a gate that is permanently red is a gate everyone learns to
 * bypass — at which point it protects nothing and costs a CI slot. So the
 * baseline IS the ceiling: a rule may not acquire a check it did not already
 * have, and no check may rise in total.
 *
 * Improvements never block. If findings DROP, the gate passes and prints the
 * stale-baseline notice; you commit the smaller baseline with `--update`. A gate
 * that fails you for fixing something is a gate people route around.
 *
 * SMELLS COUNT TOO — DELIBERATELY
 *
 * The ratchet covers both tiers. A smell is not proof of a defect and must never
 * be reported as one, but ADDING a new one is still a regression: it means new
 * code took a shape that has repeatedly needed a probe to clear. Blocking the
 * increase costs an author one comment in the registry; not blocking it is how
 * the name-inference debt reached 23 sites.
 *
 * SPEED
 *
 * The audit itself is ~0.5s of CPU; the rest is tsx startup. On the pre-commit
 * path only the rules whose files actually changed are re-audited, and their
 * finding sets are compared against the baseline individually — which needs no
 * global scan and no full-repo total. CI runs the whole thing.
 *
 * Usage:
 *   tsx scripts/rule-audit-gate.ts             # full check against the baseline
 *   tsx scripts/rule-audit-gate.ts --changed   # only rules touched by the diff
 *   tsx scripts/rule-audit-gate.ts --update    # re-record the baseline
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

import { buildLedger } from './build-rule-ledger.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(REPO_ROOT, 'docs', 'rule-ledger', 'baseline.json');
const PLUGINS = ['secure-coding', 'node-security', 'browser-security'];

interface Baseline {
  /** Recorded so a reader can tell whether the file predates a rule's arrival. */
  generated: string;
  /** `plugin/rule` → sorted check ids. The per-rule ceiling. */
  rules: Record<string, string[]>;
}

function readBaseline(): Baseline | null {
  if (!fs.existsSync(BASELINE)) return null;
  return JSON.parse(fs.readFileSync(BASELINE, 'utf8')) as Baseline;
}

function currentRules(only?: Set<string>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  // Narrow the PLUGIN list too: collectFacts reads and comment-strips every rule
  // in a plugin before anything is filtered, so scoping the rule set alone still
  // pays for the other two plugins.
  const plugins = only ? [...new Set([...only].map((k) => k.split('/')[0]))] : PLUGINS;
  for (const e of buildLedger(plugins, only)) {
    out[`${e.plugin}/${e.rule}`] = e.findings.map((f) => f.id).sort();
  }
  return out;
}

/**
 * Rules whose own directory changed, from the staged diff.
 *
 * Deliberately NOT "rules whose findings could have changed". A shared util
 * edit can alter a rule that this list misses — which is why CI runs the full
 * gate and this mode exists only to keep the commit hook off the critical path.
 */
function changedRules(): string[] {
  const diff = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  const hits = new Set<string>();
  for (const file of diff.split('\n')) {
    const m = /^packages\/eslint-plugin-([^/]+)\/src\/rules\/([^/]+)\//.exec(file);
    if (m && PLUGINS.includes(m[1])) hits.add(`${m[1]}/${m[2]}`);
  }
  return [...hits];
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--update')) {
    const baseline: Baseline = { generated: new Date().toISOString().slice(0, 10), rules: currentRules() };
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, JSON.stringify(baseline, null, 2) + '\n');
    const total = Object.values(baseline.rules).reduce((n, f) => n + f.length, 0);
    console.log(`Baseline recorded: ${Object.keys(baseline.rules).length} rules, ${total} findings.`);
    return;
  }

  const baseline = readBaseline();
  if (!baseline) {
    console.error('No baseline. Run: npm run rule-audit -- --update');
    process.exit(1);
  }

  // On the pre-commit path, only look at rules the commit actually touches.
  // A rule absent from the baseline is NEW, and a new rule is held to the
  // current standard rather than grandfathered — that is the "force better
  // quality" half of the ratchet.
  const scope = args.includes('--changed') ? changedRules() : null;
  if (scope && scope.length === 0) {
    console.log('rule-audit: no rule files changed.');
    return;
  }

  const current = currentRules(scope ? new Set(scope) : undefined);
  const names = scope ?? Object.keys(current);
  const regressions: string[] = [];
  const improvements: string[] = [];

  for (const name of names) {
    const now = current[name] ?? [];
    const before = baseline.rules[name];

    if (!before) {
      // A brand-new rule may carry NO findings at all. Everything in the
      // catalogue is either a fact about its files or a shape that has needed
      // a probe before; neither is acceptable in code written today.
      if (now.length) {
        regressions.push(`NEW RULE ${name} — must be clean, has: ${now.join(', ')}`);
      }
      continue;
    }

    const added = countDelta(before, now).added;
    const removed = countDelta(before, now).removed;
    if (added.length) regressions.push(`${name} — gained: ${added.join(', ')}`);
    if (removed.length) improvements.push(`${name} — fixed: ${removed.join(', ')}`);
  }

  for (const i of improvements) console.log(`✅ ${i}`);

  if (regressions.length) {
    console.error(`\n⛔ rule-audit ratchet: ${regressions.length} regression(s)\n`);
    for (const r of regressions) console.error(`   ${r}`);
    console.error(
      '\nEach line is a check in scripts/rule-audit.ts. Read the rule\'s dossier in\n' +
        'docs/rule-ledger/ for what the check means and — for a SMELL — the probe that\n' +
        'settles it. Probe with:\n' +
        "  npx tsx scripts/probe-rule.mts <plugin>/<rule> '<code>'\n" +
        '\nA smell is not proof of a defect. It IS a shape that has needed a probe before,\n' +
        'so it does not enter the codebase unexamined.\n',
    );
    process.exit(1);
  }

  if (improvements.length) {
    console.log('\nBaseline is now stale (findings went down). Re-record it:');
    console.log('  npm run rule-audit -- --update\n');
  }
  console.log(`rule-audit: ${names.length} rule(s) checked, no regressions.`);
}

/** Multiset delta — a rule gaining a SECOND instance of a check is a regression too. */
function countDelta(before: string[], now: string[]): { added: string[]; removed: string[] } {
  const tally = (xs: string[]): Map<string, number> => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const b = tally(before);
  const n = tally(now);
  const added: string[] = [];
  const removed: string[] = [];
  for (const [k, v] of n) if (v > (b.get(k) ?? 0)) added.push(k);
  for (const [k, v] of b) if (v > (n.get(k) ?? 0)) removed.push(k);
  return { added, removed };
}

main();
