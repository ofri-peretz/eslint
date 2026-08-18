/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * lint-seal.ts — a seal is a claim, and a claim nobody re-checks goes stale.
 *
 * `BENCHMARK-RESULTS.md` is the worked example of why this file exists. On
 * 2026-08-18 it still reported `no-unlimited-resource-allocation` at "0 TP / 5
 * FP, 173 findings" and `no-toctou-vulnerability` at "0 TP / 4 FP" — both
 * superseded, both sitting there reading like current fact. Nothing checked it,
 * so nothing said.
 *
 * So `SEAL.json` is not documentation. It is an assertion this gate enforces:
 *
 *   1. SHAPE — every axis of the doctrine is present and answered. A missing
 *      axis is not a pass, it is an unanswered question.
 *   2. HONESTY — `status: "sealed"` requires every axis `met` or `n/a`. You
 *      cannot call a rule sealed while its own record says the adversarial wave
 *      never ran.
 *   3. STAMP DRIFT — the toolchain it was sealed against is compared with the
 *      installed one. This is how a seal announces that the language moved
 *      instead of quietly rotting: TypeScript 6.1 lands, the seal says 6.0.3,
 *      the gate says re-probe.
 *   4. EVIDENCE — every axis carries the command that produced its number, so a
 *      reader can re-run it rather than trust it.
 *
 *   npx tsx scripts/lint-seal.ts            # exit non-zero on a violation
 *   npx tsx scripts/lint-seal.ts --list     # print every seal and its status
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'benchmarks/rule-corpus');

/**
 * The nine axes of the doctrine. A seal answers all of them.
 *
 * @protocol-constant This is the doctrine's own list, not a tunable vocabulary.
 * Making it editable would let a seal drop the axis it fails — which is the one
 * thing the file exists to prevent.
 */
const AXES = [
  'corpus',
  'duel',
  'adversarial',
  'realSource',
  'partition',
  'behaviour',
  'coverage',
  'throughput',
  'recorded',
] as const;

const STATES = new Set(['met', 'unmet', 'n/a']);
const GAP_KINDS = new Set(['false-negative', 'false-positive', 'partition', 'scope']);

type Axis = { state?: string; evidence?: string; command?: string };
type Gap = { id?: string; kind?: string; summary?: string; why?: string; reopenWhen?: string };
type Seal = {
  rule?: string;
  status?: string;
  sealedOn?: string | null;
  sealedTo?: Record<string, string | number>;
  axes?: Record<string, Axis>;
  knownGaps?: Gap[];
};

const installed = (): Record<string, string> => {
  const read = (pkg: string): string => {
    try {
      return JSON.parse(
        fs.readFileSync(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8'),
      ).version as string;
    } catch {
      return 'unknown';
    }
  };
  return { typescript: read('typescript'), eslint: read('eslint') };
};

const problems: string[] = [];
const rows: string[] = [];

const dirs = fs.existsSync(CORPUS)
  ? fs.readdirSync(CORPUS).filter((d) => fs.existsSync(path.join(CORPUS, d, 'SEAL.json')))
  : [];

const versions = installed();

for (const dir of dirs) {
  const file = path.join(CORPUS, dir, 'SEAL.json');
  const rel = path.relative(ROOT, file);
  let seal: Seal;
  try {
    seal = JSON.parse(fs.readFileSync(file, 'utf8')) as Seal;
  } catch (error) {
    problems.push(`${rel}: not valid JSON — ${(error as Error).message}`);
    continue;
  }

  const expected = dir.replace('__', '/');
  if (seal.rule !== expected) {
    problems.push(`${rel}: rule is "${seal.rule}", directory says "${expected}"`);
  }
  if (seal.status !== 'sealed' && seal.status !== 'open') {
    problems.push(`${rel}: status must be "sealed" or "open", found "${seal.status}"`);
  }

  // 1. SHAPE — every axis answered.
  const unmet: string[] = [];
  for (const axis of AXES) {
    const entry = seal.axes?.[axis];
    if (!entry) {
      problems.push(`${rel}: axis "${axis}" is missing — an unanswered axis is not a pass`);
      continue;
    }
    if (!STATES.has(String(entry.state))) {
      problems.push(`${rel}: axis "${axis}" has state "${entry.state}"`);
    }
    // 4. EVIDENCE — a number with no command behind it is not in this file.
    if (!entry.evidence?.trim()) {
      problems.push(`${rel}: axis "${axis}" has no evidence`);
    }
    if (!entry.command?.trim()) {
      problems.push(`${rel}: axis "${axis}" has no command to reproduce it`);
    }
    if (entry.state === 'unmet') unmet.push(axis);
  }
  for (const axis of Object.keys(seal.axes ?? {})) {
    if (!(AXES as readonly string[]).includes(axis)) {
      problems.push(`${rel}: unknown axis "${axis}"`);
    }
  }

  // 2. HONESTY — sealed means nothing is outstanding.
  if (seal.status === 'sealed') {
    if (unmet.length > 0) {
      problems.push(
        `${rel}: status "sealed" but ${unmet.length} axis/axes unmet — ${unmet.join(', ')}`,
      );
    }
    if (!seal.sealedOn) {
      problems.push(`${rel}: status "sealed" with no sealedOn date`);
    }
  }

  // 3. STAMP DRIFT — the language or toolchain moved under a finished claim.
  if (seal.status === 'sealed') {
    for (const [tool, version] of Object.entries(versions)) {
      const stamped = seal.sealedTo?.[tool];
      if (stamped !== undefined && version !== 'unknown' && String(stamped) !== version) {
        problems.push(
          `${rel}: sealed against ${tool}@${stamped}, installed is ${version} — re-probe, then restamp`,
        );
      }
    }
  }

  // Gaps are allowed — unlabelled ones are not.
  for (const [index, gap] of (seal.knownGaps ?? []).entries()) {
    const at = `${rel}: knownGaps[${index}]`;
    if (!gap.id?.trim()) problems.push(`${at} has no id`);
    if (!GAP_KINDS.has(String(gap.kind))) problems.push(`${at} has kind "${gap.kind}"`);
    if (!gap.summary?.trim()) problems.push(`${at} has no summary`);
    if (!gap.why?.trim()) problems.push(`${at} does not say why it is acceptable to ship with`);
    // The one that keeps a gap from becoming permanent by default.
    if (!gap.reopenWhen?.trim()) {
      problems.push(`${at} has no reopenWhen — a gap with no reopen condition is an excuse`);
    }
  }

  const gaps = seal.knownGaps?.length ?? 0;
  rows.push(
    `  ${(seal.status ?? '?').padEnd(7)} ${expected.padEnd(52)} ${
      unmet.length ? `${unmet.length} unmet: ${unmet.join(', ')}` : 'all axes answered'
    }${gaps ? ` · ${gaps} known gap(s)` : ''}`,
  );
}

if (process.argv.includes('--list') || problems.length === 0) {
  console.log(`\n${dirs.length} seal record(s):\n`);
  for (const row of rows.sort()) console.log(row);
}

if (problems.length > 0) {
  console.error(`\n⛔ lint-seal: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`   ${problem}`);
  console.error(
    '\nA seal is a claim this gate re-checks. See benchmarks/rule-corpus/SEAL-SCHEMA.md.\n',
  );
  process.exit(1);
}

console.log(`\n✅ ${dirs.length} seal record(s) consistent.\n`);
