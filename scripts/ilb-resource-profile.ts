#!/usr/bin/env -S npx tsx
/**
 * ilb-resource-profile — measure peak RSS + cold-start time per engine + per
 * config preset, on a fixed corpus.
 *
 * Closes the §3 (Performance) and §12 (Operational) `(gap)` rows in
 * `distribution/EVALUATION_METRICS.md`:
 *
 *   - Peak memory footprint (RSS, MB)
 *   - Cold start time (ms — invocation → first byte of stdout)
 *   - CI memory profile (does the run fit a 7GB GitHub-hosted runner?)
 *
 * Method:
 *
 *   For each (engine × preset) combination, we spawn the engine as a
 *   subprocess, poll /proc/$pid (or `ps` on macOS) for RSS at 100ms
 *   intervals, record peak, and capture time-to-first-stdout-byte as
 *   the cold-start proxy.
 *
 *   We do NOT use `process.memoryUsage()` because that only measures the
 *   *current* Node process; the engine being benchmarked runs in a
 *   subprocess and its memory pattern is what matters.
 *
 * Output: benchmark-results/resource-profile.json (+ .md)
 *
 * Usage:
 *   npm run ilb:resource-profile
 *   npm run ilb:resource-profile -- --engine oxlint
 *   npm run ilb:resource-profile -- --corpus apps/docs/src
 */

import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const OUT_DIR = path.join(REPO_ROOT, 'benchmark-results');

// CI runner memory ceiling — GitHub-hosted ubuntu-latest is 7GB. We
// fail if any preset crosses 80% of that, because the rest of CI
// (typescript compiler, tests, etc.) needs headroom.
const CI_RUNNER_RAM_GB = 7;
const CI_MEMORY_BUDGET_MB = CI_RUNNER_RAM_GB * 1024 * 0.8;

interface ProfileRow {
  engine: 'eslint' | 'oxlint';
  preset: string;
  command: string;
  corpus: string;
  fileCount: number;
  coldStartMs: number;
  totalWallMs: number;
  peakRssMb: number;
  averageRssMb: number;
  rssSampleCount: number;
  exitCode: number;
  fitsCIBudget: boolean;
}

interface Args {
  corpus: string;
  engine?: 'eslint' | 'oxlint';
  runs: number;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string, def?: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
  };
  return {
    corpus: get('--corpus', 'apps/docs/src')!,
    engine: get('--engine') as 'eslint' | 'oxlint' | undefined,
    runs: Number(get('--runs', '3')),
  };
}

function countFiles(corpus: string): number {
  try {
    const out = execSync(
      `find ${corpus} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) | wc -l`,
      { cwd: REPO_ROOT, encoding: 'utf8' },
    );
    return Number(out.trim());
  } catch {
    return 0;
  }
}

/**
 * Sample RSS of a pid at fixed intervals. Returns array of MB readings.
 * Stops when the process exits.
 *
 * Uses `ps` because it works identically on macOS and Linux; reading
 * /proc/$pid/status would be Linux-only.
 */
function sampleRss(pid: number, intervalMs: number): { samples: number[]; stop: () => void } {
  const samples: number[] = [];
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    try {
      const out = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf8' }).trim();
      const kb = Number(out);
      if (!Number.isNaN(kb)) samples.push(kb / 1024);
    } catch {
      stopped = true;
      return;
    }
    setTimeout(tick, intervalMs);
  };
  setTimeout(tick, intervalMs);
  return {
    samples,
    stop: () => {
      stopped = true;
    },
  };
}

async function profileRun(
  engine: 'eslint' | 'oxlint',
  preset: string,
  command: string[],
  corpus: string,
): Promise<ProfileRow> {
  const fileCount = countFiles(corpus);
  const start = performance.now();
  const child = spawn(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const rss = sampleRss(child.pid!, 100);
  let firstByteAt: number | null = null;

  child.stdout.on('data', () => {
    if (firstByteAt === null) firstByteAt = performance.now();
  });

  const exitCode: number = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? -1));
  });

  rss.stop();
  const totalWallMs = Math.round(performance.now() - start);
  const coldStartMs = firstByteAt !== null ? Math.round(firstByteAt - start) : totalWallMs;
  const peakRssMb = rss.samples.length > 0 ? Math.max(...rss.samples) : 0;
  const averageRssMb =
    rss.samples.length > 0 ? rss.samples.reduce((a, b) => a + b, 0) / rss.samples.length : 0;

  return {
    engine,
    preset,
    command: command.join(' '),
    corpus,
    fileCount,
    coldStartMs,
    totalWallMs,
    peakRssMb: Math.round(peakRssMb),
    averageRssMb: Math.round(averageRssMb),
    rssSampleCount: rss.samples.length,
    exitCode,
    fitsCIBudget: peakRssMb < CI_MEMORY_BUDGET_MB,
  };
}

async function main() {
  const args = parseArgs();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // The presets we profile. Each is a (engine, name, command) tuple
  // that exercises a realistic invocation pattern.
  const presets: Array<{
    engine: 'eslint' | 'oxlint';
    name: string;
    cmd: string[];
  }> = (
    [
      {
        engine: 'eslint',
        name: 'eslint-flagship',
        cmd: ['npx', 'eslint', '--no-warn-ignored', '--config', 'eslint.flagship.config.mjs', args.corpus],
      },
      {
        engine: 'oxlint',
        name: 'oxlint-flagship',
        cmd: ['npx', 'oxlint', '--config', '.oxlintrc.flagship.json', args.corpus],
      },
      {
        engine: 'oxlint',
        name: 'oxlint-default',
        cmd: ['npx', 'oxlint', args.corpus],
      },
    ] as const
  )
    .map((p) => ({ engine: p.engine, name: p.name, cmd: [...p.cmd] }))
    .filter((p) => !args.engine || p.engine === args.engine);

  const rows: ProfileRow[] = [];
  for (const preset of presets) {
    // Take N runs, keep median.
    const samples: ProfileRow[] = [];
    for (let i = 0; i < args.runs; i++) {
      const row = await profileRun(preset.engine, preset.name, preset.cmd, args.corpus);
      samples.push(row);
    }
    // Median by totalWallMs.
    samples.sort((a, b) => a.totalWallMs - b.totalWallMs);
    rows.push(samples[Math.floor(samples.length / 2)]);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    platform: `${os.platform()}-${os.arch()}`,
    nodeVersion: process.version,
    ciMemoryBudgetMb: Math.round(CI_MEMORY_BUDGET_MB),
    runs: rows,
  };

  const jsonPath = path.join(OUT_DIR, 'resource-profile.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  const mdPath = path.join(OUT_DIR, 'resource-profile.md');
  const md = renderMarkdown(result);
  fs.writeFileSync(mdPath, md);

  // eslint-disable-next-line no-console
  console.log(`Wrote ${jsonPath} and ${mdPath}`);
  // eslint-disable-next-line no-console
  console.log(`Memory budget gate: ${Math.round(CI_MEMORY_BUDGET_MB)} MB peak RSS allowed`);
  const fails = rows.filter((r) => !r.fitsCIBudget);
  if (fails.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `FAIL — ${fails.length}/${rows.length} preset(s) exceeded CI memory budget:`,
      fails.map((f) => `${f.preset} = ${f.peakRssMb} MB`).join(', '),
    );
    process.exit(1);
  }
}

function renderMarkdown(result: {
  generatedAt: string;
  platform: string;
  nodeVersion: string;
  ciMemoryBudgetMb: number;
  runs: ProfileRow[];
}): string {
  const lines: string[] = [];
  lines.push('# Resource profile — peak RSS + cold-start');
  lines.push('');
  lines.push(`> Generated by \`npm run ilb:resource-profile\` at ${result.generatedAt}.`);
  lines.push(
    `> Platform: \`${result.platform}\`, Node ${result.nodeVersion}, CI memory budget ${result.ciMemoryBudgetMb} MB.`,
  );
  lines.push('');
  lines.push('## Per-preset peak memory + cold-start');
  lines.push('');
  lines.push('| Preset | Engine | Files | Cold-start (ms) | Wall (ms) | Peak RSS (MB) | Avg RSS (MB) | Fits CI? |');
  lines.push('| :--- | :--- | ---: | ---: | ---: | ---: | ---: | :---: |');
  for (const r of result.runs) {
    lines.push(
      `| \`${r.preset}\` | ${r.engine} | ${r.fileCount} | ${r.coldStartMs} | ${r.totalWallMs} | ${r.peakRssMb} | ${r.averageRssMb} | ${r.fitsCIBudget ? '✅' : '❌'} |`,
    );
  }
  lines.push('');
  lines.push('## How this maps to evaluation metrics');
  lines.push('');
  lines.push(
    '- **Peak memory footprint** (`distribution/EVALUATION_METRICS.md` §3) — the `Peak RSS (MB)` column.',
  );
  lines.push(
    '- **Cold start time** (§3) — the `Cold-start (ms)` column (invocation → first byte of stdout).',
  );
  lines.push(
    `- **CI memory profile** (§12) — the \`Fits CI?\` column. ✅ = peak < ${result.ciMemoryBudgetMb} MB (80% of a 7 GB GitHub-hosted runner).`,
  );
  return lines.join('\n');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
