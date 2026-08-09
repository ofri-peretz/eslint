#!/usr/bin/env -S npx tsx
/**
 * Render the latest ilb-headline snapshot as the esbuild-style bar chart —
 * both as a Markdown block for the README and as JSON for the docs site.
 *
 * Single source of truth: both surfaces render from the SAME snapshot, so the
 * README and eslint.interlace.tools cannot drift. Nothing here is hand-typed.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const RESULTS_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-headline');
const OUT_MD = resolve(REPO_ROOT, 'benchmark-results/ilb-headline.md');
const OUT_SITE = resolve(REPO_ROOT, 'apps/docs/src/data/headline-bench.json');

if (!existsSync(RESULTS_DIR)) {
  console.error(`No results dir at ${RESULTS_DIR} — run \`npm run ilb:headline\` first.`);
  process.exit(1);
}

const snapshots = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json')).sort();
if (snapshots.length === 0) {
  console.error('No headline snapshots yet — run `npm run ilb:headline` first.');
  process.exit(1);
}

const latest = snapshots[snapshots.length - 1];
const data = JSON.parse(readFileSync(join(RESULTS_DIR, latest), 'utf8'));

const STACKS = [
  { key: 'ours', label: 'Interlace (ESLint)' },
  { key: 'competitor', label: 'Community plugins (ESLint)' },
  { key: 'oxlintNative', label: 'oxlint (native)' },
] as const;

const fmt = (ms: number | undefined | null) =>
  ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

type Row = {
  key: string;
  label: string;
  coldMs: number | null;
  warmMs: number | null;
  coldMin: number | null;
  coldMax: number | null;
  findings: number | null;
  files: number | null;
  ok: boolean;
  note?: string;
};

const rows: Row[] = STACKS.map(({ key, label }) => {
  const s = data.stacks?.[key] ?? {};
  const cold = s.cold ?? {};
  const warm = s.warm ?? {};
  return {
    key,
    label,
    coldMs: cold.ok ? cold.median : null,
    warmMs: warm.ok ? warm.median : null,
    coldMin: cold.ok ? cold.min : null,
    coldMax: cold.ok ? cold.max : null,
    findings: cold.ok ? cold.findings : null,
    files: cold.ok ? cold.filesProcessed : null,
    ok: !!cold.ok,
    note: cold.ok ? undefined : cold.note,
  };
});

// Bar scale is driven by the slowest successful COLD run — the esbuild chart
// scales to the slowest bar, which is what makes the fast one legible.
const maxCold = Math.max(...rows.filter((r) => r.ok && r.coldMs != null).map((r) => r.coldMs!));
const BAR_WIDTH = 40;
const bar = (ms: number | null) =>
  ms == null ? '' : '█'.repeat(Math.max(1, Math.round((ms / maxCold) * BAR_WIDTH)));

const lines: string[] = [];
lines.push('# ILB-Headline — one repo, one job, three stacks');
lines.push('');
lines.push(
  `> Time to lint **${data.repo}** (\`${data.glob}\`) from scratch with each stack's ` +
  `recommended preset. Median of ${data.repeat} runs after a discarded warmup.`,
);
lines.push('');
lines.push(
  `- **Generated**: ${data.generatedAt} · **ESLint**: ${String(data.versions?.eslint ?? '').replace(/^v?/, 'v')} · ` +
  `**oxlint**: ${data.versions?.oxlint} · **Node**: ${data.versions?.node}`,
);
lines.push('');

lines.push('```text');
for (const r of rows) {
  if (!r.ok) {
    lines.push(`${r.label.padStart(28)}  FAILED — excluded from the chart`);
    continue;
  }
  lines.push(`${r.label.padStart(28)}  ${bar(r.coldMs)} ${fmt(r.coldMs)}`);
}
lines.push('```');
lines.push('');

lines.push('| Stack | Cold (median) | Spread (min–max) | Warm (median) | Findings | Files |');
lines.push('| :--- | ---: | ---: | ---: | ---: | ---: |');
for (const r of rows) {
  if (!r.ok) {
    lines.push(`| ${r.label} | FAILED | — | — | — | — |`);
    continue;
  }
  lines.push(
    `| ${r.label} | ${fmt(r.coldMs)} | ${fmt(r.coldMin)}–${fmt(r.coldMax)} | ` +
    `${fmt(r.warmMs)} | ${r.findings ?? '—'} | ${r.files ?? '—'} |`,
  );
}
lines.push('');

// The caveats are part of the number, not a footnote. A headline chart without
// them is the exact thing that makes benchmarks untrustworthy.
lines.push('## How to read this');
lines.push('');
lines.push(
  `- **Same file set**: every stack lints the same explicit glob (\`${data.glob}\`). ` +
  `ESLint-stack parity: **${data.fileSet?.eslintParity ? 'verified' : 'NOT verified'}** ` +
  `(ours ${data.fileSet?.ours} files, competitor ${data.fileSet?.competitor} files).`,
);
lines.push(
  '- **Different rule sets, same job.** Each stack runs its own recommended preset. ' +
  'A stack that runs fewer rules doing less work is not "faster" in a way you can use — ' +
  'read the findings column alongside the time.',
);
lines.push(
  '- **oxlint is a native binary and will win on wall-clock.** That is the honest result, ' +
  'not a rounding error: it is a different engine class. The number that matters for an ' +
  'ESLint user is the ESLint-to-ESLint comparison.',
);
lines.push('- **Cold** = `--no-cache`. **Warm** = `--cache` against a primed cache file.');
lines.push(
  `- **Median of ${data.repeat}**, first run discarded as warmup. Spread is shown so a ` +
  'noisy machine is visible rather than hidden.',
);
if (data.fileSet?.oxlintParity === null) {
  lines.push('- oxlint did not report a file count in this run, so its file-set parity is unverified.');
}
lines.push('');
lines.push(`Reproduce: \`npm run ilb:headline -- --repo=${data.repo} --repeat=${data.repeat}\``);
lines.push('');

writeFileSync(OUT_MD, lines.join('\n'));

// Site payload — the docs page renders from this, so site and README agree.
mkdirSync(dirname(OUT_SITE), { recursive: true });
writeFileSync(OUT_SITE, JSON.stringify({
  schema: 'ilb-headline-site/v1',
  generatedAt: data.generatedAt,
  repo: data.repo,
  glob: data.glob,
  repeat: data.repeat,
  versions: data.versions,
  fileSet: data.fileSet,
  rows: rows.map((r) => ({
    key: r.key, label: r.label, coldMs: r.coldMs, warmMs: r.warmMs,
    coldMin: r.coldMin, coldMax: r.coldMax,
    findings: r.findings, files: r.files, ok: r.ok,
  })),
}, null, 2));

console.log(`Wrote ${OUT_MD}`);
console.log(`Wrote ${OUT_SITE}`);
if (!data.fileSet?.eslintParity) {
  console.warn('\nWARNING: ESLint-stack file-set parity NOT verified — do not publish this number.');
}
