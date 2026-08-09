#!/usr/bin/env -S npx tsx
/**
 * Publish benchmark measurements to Supabase (append-only history).
 *
 * Division of responsibility:
 *   - git-committed JSON  → what is true NOW (auditable, diffable, offline)
 *   - GitHub Pages badges → what a README can display without a commit
 *   - Supabase            → how it CHANGED (trends, regressions, provenance)
 *
 * The first two are the published surfaces; this is the historical record
 * behind them. It is deliberately NOT on the critical path: if Supabase is
 * unreachable, the badges and the committed numbers still ship. A metrics
 * store outage must never block publishing a benchmark that already ran.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (required to actually write)
 *   GITHUB_RUN_ID                             (optional, links row → CI logs)
 *   BENCH_SUPABASE_REQUIRED=1                 (fail the job if publish fails)
 *
 * Usage: npx tsx scripts/publish-benchmark-supabase.ts
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const HEADLINE_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-headline');
const FLAGSHIP_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-flagship');
const COMMITS_FILE = resolve(REPO_ROOT, '..', 'oos', 'COMMITS.txt');

const REQUIRED = process.env.BENCH_SUPABASE_REQUIRED === '1';

function latestSnapshot(dir: string): any | null {
  const all = latestSnapshotPerRepo(dir);
  return all.length ? all[all.length - 1] : null;
}

/**
 * Every repo's latest snapshot, not just one.
 *
 * Snapshots are `<date>-<repo>.json` and the weekly job benches several repos.
 * Taking only the alphabetically-last file would silently publish ONE repo's
 * numbers and drop the rest — the history would look complete while missing
 * half the corpus.
 */
function latestSnapshotPerRepo(dir: string): any[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const byRepo = new Map<string, string>();
  for (const f of files) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.json$/);
    // Legacy `<date>.json` files have no repo segment; key them by filename.
    byRepo.set(m ? m[2] : f, f);
  }
  return [...byRepo.values()].map((f) =>
    JSON.parse(readFileSync(join(dir, f), 'utf8')),
  );
}

/** Map corpus repo → the commit it was measured at, for reproducibility. */
function corpusCommits(): Record<string, string> {
  if (!existsSync(COMMITS_FILE)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(COMMITS_FILE, 'utf8').split('\n')) {
    const [name, sha] = line.trim().split(/\s+/);
    if (name && sha) out[name] = sha;
  }
  return out;
}

type Row = Record<string, unknown>;

const commits = corpusCommits();
const ghaRunId = process.env.GITHUB_RUN_ID ?? null;
const runner = process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local';
const rows: Row[] = [];

// ── Headline: one row per (repo × stack) ───────────────────────────────
const STACK_LABELS: Record<string, string> = {
  ours: 'Interlace on ESLint',
  oursOxlint: 'Interlace on oxlint',
  competitor: 'Community plugins (ESLint)',
  oxlintNative: 'oxlint built-ins (different scope)',
};

for (const headline of latestSnapshotPerRepo(HEADLINE_DIR)) {
  if (!headline?.generatedAt) continue;
  for (const [stack, s] of Object.entries<any>(headline.stacks ?? {})) {
    const cold = s?.cold ?? {};
    const warm = s?.warm ?? {};
    rows.push({
      suite: 'ilb-headline',
      stack,
      stack_label: STACK_LABELS[stack] ?? stack,
      repo: headline.repo,
      rule_id: null,
      cold_ms: cold.ok ? cold.median : null,
      warm_ms: warm.ok ? warm.median : null,
      cold_min_ms: cold.ok ? cold.min : null,
      cold_max_ms: cold.ok ? cold.max : null,
      findings: cold.ok ? cold.findings : null,
      files_processed: cold.ok ? cold.filesProcessed : null,
      repeats: headline.repeat ?? 1,
      // Failed stacks are recorded, not skipped — see the table comment.
      ok: !!cold.ok,
      failure_note: cold.ok ? null : (cold.note ?? 'unknown failure'),
      file_set_parity: headline.fileSet?.eslintParity ?? null,
      corpus_commit: commits[headline.repo] ?? null,
      eslint_version: headline.versions?.eslint ?? null,
      oxlint_version: headline.versions?.oxlint ?? null,
      node_version: headline.versions?.node ?? null,
      runner,
      gha_run_id: ghaRunId,
      measured_at: headline.generatedAt,
    });
  }
}

// ── Flagship: one row per (rule, repo, stack) ──────────────────────────
const flagship = latestSnapshot(FLAGSHIP_DIR);
if (flagship?.results?.length) {
  const measuredAt: string =
    flagship.generatedAt ?? new Date().toISOString();
  for (const r of flagship.results) {
    for (const [stack, key] of [
      ['ours', 'oursEslint'],
      ['competitor', 'competitorEslint'],
      ['oxlintNative', 'oxlintNative'],
    ] as const) {
      const run = r.runs?.[key];
      if (!run) continue;
      rows.push({
        suite: 'ilb-flagship',
        stack,
        stack_label: stack,
        repo: r.repo,
        rule_id: r.rule,
        cold_ms: run.cold?.ms ?? null,
        warm_ms: run.warm?.ms ?? null,
        cold_min_ms: run.cold?.msMin ?? null,
        cold_max_ms: run.cold?.msMax ?? null,
        findings: run.cold?.findingsCount ?? null,
        files_processed: run.cold?.filesProcessed ?? null,
        repeats: run.cold?.repeats ?? 1,
        ok: run.cold?.exitCode === 0 || run.cold?.exitCode === 1,
        failure_note: null,
        file_set_parity: null,
        corpus_commit: commits[r.repo] ?? null,
        eslint_version: flagship.versions?.eslint ?? null,
        oxlint_version: flagship.versions?.oxlint ?? null,
        node_version: flagship.versions?.node ?? null,
        runner,
        gha_run_id: ghaRunId,
        measured_at: measuredAt,
      });
    }
  }
}

if (!rows.length) {
  console.error('No benchmark rows to publish — run the benches first.');
  process.exit(REQUIRED ? 1 : 0);
}

console.log(`Prepared ${rows.length} row(s) for Supabase.`);
const okCount = rows.filter((r) => r.ok).length;
console.log(`  ${okCount} ok, ${rows.length - okCount} failed (failures are recorded, not dropped).`);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn(
    '\nSUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — dry run, nothing written.',
  );
  console.log(JSON.stringify(rows.slice(0, 2), null, 2));
  process.exit(REQUIRED ? 1 : 0);
}

// PostgREST insert. on_conflict on the UNIQUE key makes re-runs idempotent:
// publishing the same measured_at twice cannot double-count a week.
const endpoint =
  `${url.replace(/\/$/, '')}/rest/v1/benchmark_runs` +
  `?on_conflict=suite,stack,repo,rule_id,measured_at`;

// Wrapped rather than top-level await: this repo transforms scripts to CJS,
// where top-level await is a build error.
async function main() {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // ignore-duplicates: never overwrite a measured row.
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
    }
    console.log(`\nPublished ${rows.length} row(s) to benchmark_runs.`);
  } catch (err) {
    // Deliberately non-fatal by default: the badges and committed numbers have
    // already shipped. Losing a history row must not fail an otherwise good run.
    console.error(`\nSupabase publish failed: ${String(err).slice(0, 400)}`);
    if (REQUIRED) {
      console.error('BENCH_SUPABASE_REQUIRED=1 — failing the job.');
      process.exit(1);
    }
    console.warn('Continuing: published surfaces are unaffected.');
  }
}

void main();
