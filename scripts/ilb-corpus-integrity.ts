#!/usr/bin/env -S npx tsx

/**
 * ILB Corpus Integrity (Gap F) — verifies that every pinned commit in
 * scripts/ilb-wild.mjs's BENCHMARK_REPOS still resolves to the same SHA
 * on the remote. Catches:
 *
 *   - Repos archived / made private upstream (`git ls-remote` fails)
 *   - Tags rewritten on the remote (recorded SHA != current SHA)
 *   - `commit: 'main'` (or any branch) — flagged as drift-prone, not
 *     stable. Either pin to a tag/SHA or accept that benches will drift.
 *
 * Outputs benchmark-results/corpus-integrity.json. On first run, records
 * the current resolved SHAs as baseline. On subsequent runs, diffs against
 * the baseline and reports any change. Run nightly; alert on mismatch.
 *
 * Usage:
 *   tsx scripts/ilb-corpus-integrity.ts              # check + write report
 *   tsx scripts/ilb-corpus-integrity.ts --update     # also update the baseline
 *   tsx scripts/ilb-corpus-integrity.ts --json       # print JSON to stdout
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WILD_SOURCE = path.join(ROOT, 'scripts', 'ilb-wild.ts');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'corpus-integrity.json');

const args = new Set(process.argv.slice(2));
const flag = (n) => args.has(`--${n}`);
const UPDATE = flag('update');
const EMIT_JSON = flag('json');

// ── Parse BENCHMARK_REPOS from ilb-wild.mjs ─────────────────────────

function parseRegistry() {
  const src = fs.readFileSync(WILD_SOURCE, 'utf-8');
  // Find the start of the array, then walk braces to find each entry.
  const start = src.indexOf('const BENCHMARK_REPOS = [');
  if (start < 0) throw new Error('BENCHMARK_REPOS not found in ilb-wild.ts');
  // Brute-force: regex over the file for { name: '...', repo: '...', commit: '...' }
  // (each entry has these three fields contiguously.)
  const re = /name:\s*'([^']+)'[\s\S]{0,200}?repo:\s*'([^']+)'[\s\S]{0,80}?commit:\s*'([^']+)'/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ name: m[1], repo: m[2], commit: m[3] });
  }
  if (out.length === 0) throw new Error('Failed to extract any BENCHMARK_REPOS entries');
  return out;
}

// ── Resolve a commit-ish (tag / branch / SHA) to a SHA on the remote ─

function resolveOnRemote(repo, commitish) {
  // 40-char hex → already a stable SHA pin. We don't ls-remote (the remote
  // wouldn't return arbitrary SHAs as refs anyway). Trust the pin and
  // optionally validate by attempting a fetch — but for the integrity
  // check, the pin itself IS the contract: SHAs cannot drift on the remote.
  if (/^[a-f0-9]{40}$/i.test(commitish)) {
    return { sha: commitish, kind: 'sha', ref: null };
  }
  // Tag → ls-remote --tags returns "<sha>\trefs/tags/<tag>"
  // Branch → ls-remote --heads returns "<sha>\trefs/heads/<branch>"
  try {
    const out = execSync(`git ls-remote --refs ${repo} ${commitish}`, {
      encoding: 'utf-8',
      timeout: 30_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    if (!out) return { sha: null, kind: 'unknown', error: 'no matching refs' };
    const lines = out.split('\n');
    const peeled = lines.find((l) => l.endsWith('^{}'));
    const target = peeled ?? lines[0];
    const [sha, ref] = target.split('\t');
    const kind = ref?.includes('refs/tags/') ? 'tag' : ref?.includes('refs/heads/') ? 'branch' : 'sha';
    return { sha, kind, ref };
  } catch (err) {
    return { sha: null, kind: 'error', error: String(err.message ?? err).slice(0, 200) };
  }
}

// ── Check ────────────────────────────────────────────────────────────

const registry = parseRegistry();
console.log(`Checking ${registry.length} pinned repos...`);

const baseline = fs.existsSync(REPORT_PATH)
  ? JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'))
  : null;

const current = {};
const drifts = [];
const branches = [];
const errors = [];

for (const r of registry) {
  process.stdout.write(`  ${r.name.padEnd(40)} `);
  const resolved = resolveOnRemote(r.repo, r.commit);
  current[r.name] = {
    repo: r.repo,
    commit: r.commit,
    resolvedSha: resolved.sha,
    kind: resolved.kind,
    ref: resolved.ref ?? null,
    error: resolved.error ?? null,
    checkedAt: new Date().toISOString(),
  };

  if (resolved.kind === 'error' || !resolved.sha) {
    console.log(`❌ ${resolved.error}`);
    errors.push({ name: r.name, error: resolved.error });
    continue;
  }
  if (resolved.kind === 'branch') {
    console.log(`⚠️  branch (${resolved.sha.slice(0, 8)}) — drift-prone`);
    branches.push({ name: r.name, branch: r.commit, sha: resolved.sha });
  }
  const prev = baseline?.repos?.[r.name]?.resolvedSha;
  if (prev && prev !== resolved.sha) {
    console.log(`⚠️  DRIFT  baseline ${prev.slice(0, 8)} → now ${resolved.sha.slice(0, 8)}`);
    drifts.push({ name: r.name, baseline: prev, current: resolved.sha });
  } else if (prev) {
    console.log(`✅ ${resolved.kind} ${resolved.sha.slice(0, 8)} (matches baseline)`);
  } else {
    console.log(`📝 ${resolved.kind} ${resolved.sha.slice(0, 8)} (first record)`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  totalRepos: registry.length,
  drifts: drifts.length,
  branches: branches.length,
  errors: errors.length,
  driftDetails: drifts,
  branchDetails: branches,
  errorDetails: errors,
  repos: current,
};

if (EMIT_JSON) {
  console.log('\n' + JSON.stringify(summary, null, 2));
}

const shouldWrite = UPDATE || !baseline;
if (shouldWrite) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
  console.log(`\n✅ ${path.relative(ROOT, REPORT_PATH)} ${baseline ? 'updated' : 'created (baseline)'}`);
} else {
  console.log(`\nℹ️  Baseline preserved. Re-run with --update to record current SHAs.`);
}

// Exit non-zero on drift or hard errors so CI can gate.
const exitCode = drifts.length + errors.length > 0 ? 1 : 0;
console.log(
  `\nSummary: ${drifts.length} drift · ${branches.length} branches (drift-prone) · ${errors.length} error · ${
    registry.length - drifts.length - errors.length
  } stable.`,
);
process.exit(exitCode);
