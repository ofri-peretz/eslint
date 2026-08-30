/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Stage 4 (Test) — continuous evals over the agent configuration.
 *
 * Two layers, because they cost different things and fail differently:
 *
 *   1. Config checks — deterministic, free, always run. Every relative link in an
 *      agent-facing document resolves. A rule document that points at a moved file is
 *      a rule the agent silently cannot read, and nothing else in this repo notices.
 *   2. Task evals — real prompts with accepted outcomes, run against the current
 *      configuration. Needs ANTHROPIC_API_KEY. Without one the layer reports
 *      `skipped`, never `failed`: a fork or a secretless PR must not be blocked by an
 *      eval it cannot run.
 *
 * See evals/README.md for the case format and how to choose cases.
 *
 * Usage:
 *   tsx scripts/run-evals.ts             # both layers
 *   tsx scripts/run-evals.ts --config    # layer 1 only
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = path.resolve(__dirname, '..');
const CASES_DIR = path.join(REPO_ROOT, 'evals/cases');
const RESULTS_DIR = path.join(REPO_ROOT, 'evals/results');

/** Documents an agent is expected to read and obey. */
const CONFIG_GLOBS = ['CLAUDE.md', 'AGENTS.md'];
const CONFIG_DIRS = ['.agent'];

export interface Expectation {
  check: 'output-contains' | 'output-omits' | 'shell';
  value: string;
}

export interface EvalCase {
  id: string;
  why: string;
  prompt: string;
  allowedTools?: string;
  expect: Expectation[];
}

// ---------------------------------------------------------------------------
// Layer 1 — config checks
// ---------------------------------------------------------------------------

/** `readdirSync` that answers "gone" with an empty list rather than throwing. */
function readDirOrEmpty(rel: string): fs.Dirent[] {
  try {
    return fs.readdirSync(path.join(REPO_ROOT, rel), { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

/**
 * Attempt the access and handle ENOENT rather than checking first: an
 * `existsSync` guard acts on the result of a check, and the path can be replaced
 * between the two calls (CodeQL `js/file-system-race`). The syscall either
 * succeeds or says the file is gone, with no window in between.
 */
function agentDocs(): string[] {
  const out: string[] = [];
  for (const f of CONFIG_GLOBS) {
    try {
      fs.accessSync(path.join(REPO_ROOT, f));
      out.push(f);
    } catch {
      // not present in this repo — the doc set differs per package
    }
  }
  for (const dir of CONFIG_DIRS) {
    const walk = (rel: string): void => {
      for (const e of readDirOrEmpty(rel)) {
        const child = path.join(rel, e.name);
        if (e.isDirectory()) walk(child);
        else if (e.name.endsWith('.md')) out.push(child);
      }
    };
    walk(dir);
  }
  return out.sort();
}

/**
 * Strip fenced code blocks and inline code.
 *
 * Rule documents are full of *example* markdown — `[text](link)`, `[![alt](shield)]`,
 * `[…](…)` — that is illustration, not a reference. Scanning it produced more noise
 * than findings on the first run, and a checker whose output is mostly noise gets
 * muted, which is the failure this suite exists to prevent.
 */
function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/**
 * Relative markdown links that point at nothing **from a standalone checkout**.
 *
 * Anchors, URLs and mailto are skipped, as are absolute `file:` paths — those name a
 * machine, not this tree. A link to a directory counts as resolved; several rule docs
 * deliberately point at a folder.
 *
 * A target that escapes the repository root is reported even when it exists on disk.
 * This repo sits beside its siblings (`../agents/`, `../interlace/`) and one level
 * below the documents that govern all of them, so `../agents/ARCHITECTURE.md` resolves
 * on a maintainer's machine and dangles in CI — which is a standalone clone, and so is
 * every reader's. Judging by local existence made the check pass here and fail there,
 * twice, which is worse than not having it.
 */
export function brokenLinks(docs: string[], root = REPO_ROOT): string[] {
  const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const broken: string[] = [];
  for (const doc of docs) {
    const text = stripCode(fs.readFileSync(path.join(root, doc), 'utf-8'));
    for (const m of text.matchAll(LINK)) {
      const raw = m[1];
      if (/^(https?:|mailto:|file:|#|<|\$)/.test(raw)) continue;
      // A bare word with no separator and no extension — `[CWE-XXX](link)` — is a
      // placeholder in a template, not a path. Rule docs are full of them, and they
      // are exactly the sort of noise that gets a checker muted.
      if (!raw.includes('/') && !raw.includes('.')) continue;
      const target = raw.split('#')[0];
      if (!target) continue;
      const abs = path.resolve(path.dirname(path.join(root, doc)), target);
      const escapes = path.relative(root, abs).startsWith('..');
      if (escapes) {
        broken.push(`${doc} → ${raw} (outside the repository — dangles in a clone)`);
      } else if (!fs.existsSync(abs)) {
        broken.push(`${doc} → ${raw}`);
      }
    }
  }
  return broken;
}

function runConfigLayer(): { name: string; passed: boolean; detail: string }[] {
  const docs = agentDocs();
  const results: { name: string; passed: boolean; detail: string }[] = [];

  results.push({
    name: 'agent documents found',
    passed: docs.length > 10,
    detail: `${docs.length} agent-facing documents`,
  });

  const broken = brokenLinks(docs);
  results.push({
    name: 'every relative link in an agent document resolves',
    passed: broken.length === 0,
    detail: broken.length === 0 ? 'all resolve' : broken.join('\n    '),
  });

  return results;
}

// ---------------------------------------------------------------------------
// Layer 2 — task evals
// ---------------------------------------------------------------------------

function loadCases(): EvalCase[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(CASES_DIR);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return entries
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(CASES_DIR, f), 'utf-8')) as EvalCase);
}

export function grade(output: string, expect: Expectation[]): { ok: boolean; failed: string[] } {
  const failed: string[] = [];
  const hay = output.toLowerCase();
  for (const e of expect) {
    if (e.check === 'output-contains' && !hay.includes(e.value.toLowerCase())) {
      failed.push(`expected output to contain "${e.value}"`);
    } else if (e.check === 'output-omits' && hay.includes(e.value.toLowerCase())) {
      failed.push(`expected output NOT to contain "${e.value}"`);
    } else if (e.check === 'shell') {
      const r = spawnSync('bash', ['-c', e.value], { cwd: REPO_ROOT, encoding: 'utf8' });
      if (r.status !== 0) failed.push(`shell check failed: ${e.value}`);
    }
  }
  return { ok: failed.length === 0, failed };
}

function runCase(c: EvalCase): { id: string; status: 'pass' | 'fail' | 'error'; failed: string[] } {
  const r = spawnSync(
    'claude',
    ['-p', c.prompt, '--allowedTools', c.allowedTools ?? 'Read,Grep,Glob'],
    { cwd: REPO_ROOT, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (r.error || typeof r.stdout !== 'string') {
    return { id: c.id, status: 'error', failed: [String(r.error ?? 'no output')] };
  }
  const { ok, failed } = grade(r.stdout, c.expect);
  return { id: c.id, status: ok ? 'pass' : 'fail', failed };
}

// ---------------------------------------------------------------------------

function main(): void {
  const configOnly = process.argv.includes('--config');
  let failures = 0;

  console.log('\n🧪 Layer 1 — configuration checks\n');
  for (const r of runConfigLayer()) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}\n    ${r.detail}`);
    if (!r.passed) failures++;
  }

  const cases = loadCases();
  let caseResults: ReturnType<typeof runCase>[] = [];

  if (configOnly) {
    console.log('\n🧪 Layer 2 — skipped (--config)\n');
  } else if (!process.env.ANTHROPIC_API_KEY) {
    // Reported, never fatal. An eval that cannot run is not an eval that failed, and
    // treating it as one teaches people to delete the suite.
    console.log(
      `\n🧪 Layer 2 — skipped: ANTHROPIC_API_KEY is not set (${cases.length} case(s) not run)\n`,
    );
  } else {
    console.log(`\n🧪 Layer 2 — ${cases.length} task eval(s)\n`);
    caseResults = cases.map(runCase);
    for (const r of caseResults) {
      console.log(`  ${r.status === 'pass' ? '✓' : '✗'} ${r.id}`);
      for (const f of r.failed) console.log(`      ${f}`);
      if (r.status !== 'pass') failures++;
    }
    const passed = caseResults.filter((r) => r.status === 'pass').length;
    const stamp = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(RESULTS_DIR, `${stamp}.json`),
      JSON.stringify(
        { date: stamp, total: caseResults.length, passed, results: caseResults },
        null,
        2,
      ) + '\n',
    );
    console.log(`\n  pass rate: ${passed}/${caseResults.length}`);
  }

  console.log(`\n${failures === 0 ? '✅ evals pass' : `💥 ${failures} eval failure(s)`}\n`);
  if (failures > 0) process.exit(1);
}

if (require.main === module) main();
