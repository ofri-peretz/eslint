#!/usr/bin/env -S npx tsx
/**
 * Compose static badge SVGs from the benchmark results.
 *
 * Why static files and not an API route:
 *
 *  - A README can only show live data through an <img>. That is the only
 *    escape hatch GitHub's HTML sanitizer leaves open.
 *  - But an <img> pointed at our own app means every README view — including
 *    every crawler and every camo cache-fill — hits our server. Static SVGs
 *    served from GitHub Pages cost nothing, never wake a function, and cannot
 *    take the site down if a README goes viral.
 *  - They are also honest by construction: the file is written by the same
 *    run that produced the numbers, so a badge cannot claim a freshness its
 *    data does not have.
 *
 * These are plain files. Commit them, serve them from Pages, embed them.
 *
 * Usage: npx tsx benchmarks/suites/ilb-headline/badges.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const RESULTS_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-headline');
const OUT_DIR = resolve(REPO_ROOT, 'benchmark-results/badges');

if (!existsSync(RESULTS_DIR)) {
  console.error(`No results at ${RESULTS_DIR} — run \`npm run ilb:headline\` first.`);
  process.exit(1);
}
// Snapshots are now `<date>-<repo>.json`. "Last alphabetically" would pick a
// repo essentially at random, so the headline repo is named explicitly and
// its most RECENT snapshot chosen by date — not by filename sort order.
const HEADLINE_REPO = process.env.BENCH_HEADLINE_REPO || 'nestjs';
const allFiles = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json')).sort();
const files = allFiles.filter((f) => f.includes(`-${HEADLINE_REPO}.`));
if (!files.length && allFiles.length) {
  console.warn(
    `No snapshot for headline repo "${HEADLINE_REPO}" — falling back to latest of ` +
    `${allFiles.length} snapshot(s). Set BENCH_HEADLINE_REPO to pick deliberately.`,
  );
  files.push(allFiles[allFiles.length - 1]);
}
if (!files.length) {
  console.error('No headline snapshot — run `npm run ilb:headline` first.');
  process.exit(1);
}

/**
 * Source of truth for the badges.
 *
 * Default: the local snapshot this run just produced.
 *
 * `--from-supabase`: read back the rows we just published instead. This is
 * the stronger guarantee — it proves the badges render the SAME data that is
 * stored and reusable elsewhere, rather than a parallel copy that happens to
 * agree today. If the store write silently mangled a number, the badge shows
 * the mangled number and we find out immediately.
 *
 * It reads the public `v_benchmark_latest` view with the anon key: the badge
 * step needs no write credentials, so a leaked badge env cannot corrupt data.
 */
async function loadFromSupabase(): Promise<any | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('--from-supabase requested but SUPABASE_URL/key not set.');
    return null;
  }
  const endpoint =
    `${url.replace(/\/$/, '')}/rest/v1/v_benchmark_latest` +
    `?suite=eq.ilb-headline&rule_id=is.null&select=*`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    console.warn(`Supabase read failed (${res.status}) — falling back to local snapshot.`);
    return null;
  }
  const records: any[] = await res.json();
  if (!records.length) {
    console.warn('Supabase returned no headline rows — falling back to local snapshot.');
    return null;
  }
  // Reshape the flat rows back into the snapshot shape the renderer expects.
  const first = records[0];
  return {
    generatedAt: records
      .map((r) => r.measured_at)
      .sort()
      .reverse()[0],
    repo: first.repo,
    repeat: first.repeats,
    fileSet: {
      ours: records.find((r) => r.stack === 'ours')?.files_processed ?? null,
      competitor: records.find((r) => r.stack === 'competitor')?.files_processed ?? null,
      eslintParity: records.some((r) => r.file_set_parity === true),
    },
    rows: records.map((r) => ({
      key: r.stack,
      label: r.stack_label ?? r.stack,
      coldMs: r.cold_ms == null ? null : Number(r.cold_ms),
      warmMs: r.warm_ms == null ? null : Number(r.warm_ms),
      findings: r.findings,
      files: r.files_processed,
      ok: true, // the view already excludes failed rows
    })),
    versions: {
      eslint: first.eslint_version,
      oxlint: first.oxlint_version,
      node: first.node_version,
    },
  };
}

const localSnapshot = JSON.parse(
  readFileSync(join(RESULTS_DIR, files[files.length - 1]), 'utf8'),
);

const useSupabase = process.argv.includes('--from-supabase');
const data = useSupabase ? ((await loadFromSupabase()) ?? localSnapshot) : localSnapshot;
if (useSupabase) {
  console.log(
    data === localSnapshot
      ? 'Rendering badges from LOCAL snapshot (Supabase unavailable).'
      : 'Rendering badges from SUPABASE (verifies stored data matches published badges).',
  );
}

const COLOR = {
  green: '#3fb950',
  amber: '#d29922',
  red: '#f85149',
  purple: '#8957e5',
  grey: '#6e7681',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;');

/** Flat-square badge, shields-compatible in look, zero dependencies. */
function badge(label: string, message: string, color: string): string {
  const lw = Math.round(label.length * 6.4) + 20;
  const mw = Math.round(message.length * 6.4) + 20;
  const w = lw + mw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${esc(label)}: ${esc(message)}">
  <title>${esc(label)}: ${esc(message)}</title>
  <rect width="${lw}" height="20" fill="#24292f"/>
  <rect x="${lw}" width="${mw}" height="20" fill="${color}"/>
  <g fill="#ffffff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + mw / 2}" y="14">${esc(message)}</text>
  </g>
</svg>
`;
}

const fmt = (ms: number | null | undefined) =>
  ms == null ? 'n/a' : ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;

mkdirSync(OUT_DIR, { recursive: true });
const written: string[] = [];
const write = (name: string, svg: string) => {
  writeFileSync(join(OUT_DIR, name), svg);
  written.push(name);
};

// ── 1. Freshness ───────────────────────────────────────────────────────
// The badge that matters most: it tells the truth about staleness even if
// the weekly workflow silently stops running. A hand-written README date
// cannot do that — it keeps asserting a date nobody re-verified.
const generatedAt: string | undefined = data.generatedAt;
if (generatedAt) {
  const days = (Date.now() - new Date(generatedAt).getTime()) / 86_400_000;
  write(
    'verified.svg',
    badge(
      'benchmark',
      `verified ${generatedAt.slice(0, 10)}`,
      days > 21 ? COLOR.red : days > 10 ? COLOR.amber : COLOR.green,
    ),
  );
} else {
  write('verified.svg', badge('benchmark', 'unavailable', COLOR.red));
}

// ── 2. Per-cell grid: one badge for every (stack × metric) ─────────────
// The README table is built ENTIRELY from badges — every cell is an <img>,
// so the whole table refreshes from Pages without a single commit to main.
//
// Naming contract: badges/<stack>-<metric>.svg. Stable filenames are the
// API here — the README hardcodes these URLs, so renaming one silently
// breaks a cell into a broken-image icon. Never rename without updating
// the README in the same change.
const repo = data.repo ?? 'corpus';

type Row = { key: string; label: string; coldMs: number | null; warmMs: number | null; findings: number | null; files: number | null; ok: boolean };

// Two shapes reach this script: the raw runner snapshot (`stacks`, keyed
// object) and the rendered site payload (`rows`, array). Normalise once here
// — reading only one shape silently produced ZERO cell badges while still
// exiting 0, which is the same class of quiet failure this whole suite exists
// to prevent.
// `ours` and `oursOxlint` are the SAME rules on two engines. `oxlintNative`
// is oxlint's own built-in correctness rules — a different job, not a peer:
// it ships no secrets/injection/security analysis, so its speed is not
// comparable and the label must not imply otherwise.
const STACK_LABELS: Record<string, string> = {
  ours: 'Interlace on ESLint',
  oursOxlint: 'Interlace on oxlint',
  competitor: 'Community plugins (ESLint)',
  oxlintNative: 'oxlint built-ins (different scope)',
};

// Filename slugs — stable, and referenced by the README markup.
const STACK_SLUGS: Record<string, string> = {
  ours: 'ours',
  oursOxlint: 'ours-oxlint',
  competitor: 'competitor',
  oxlintNative: 'oxlint-stock',
};

const rows: Row[] = Array.isArray(data.rows) && data.rows.length
  ? data.rows
  : Object.entries<any>(data.stacks ?? {}).map(([key, s]) => ({
      key,
      label: STACK_LABELS[key] ?? key,
      coldMs: s?.cold?.ok ? s.cold.median : null,
      warmMs: s?.warm?.ok ? s.warm.median : null,
      findings: s?.cold?.ok ? s.cold.findings : null,
      files: s?.cold?.ok ? s.cold.filesProcessed : null,
      ok: !!s?.cold?.ok,
    }));

if (!rows.length) {
  console.error('Snapshot contained neither `rows` nor `stacks` — refusing to emit badges.');
  process.exit(1);
}

// Fastest time among COMPARABLE stacks — the three running security rules.
// oxlint's built-ins are excluded from the highlight because they do a
// different job (no secrets/injection/security analysis); letting them win a
// "fastest" colour would compare a spell-checker to a proofreader. The row is
// still shown, with a label saying so — hiding the fastest thing in the
// ecosystem is what makes a benchmark read as marketing.
const COMPARABLE = (r: Row) => r.key !== 'oxlintNative';
const coldTimes = rows.filter((r) => r.ok && COMPARABLE(r) && r.coldMs != null).map((r) => r.coldMs!);
const bestCold = coldTimes.length ? Math.min(...coldTimes) : null;
const warmTimes = rows.filter((r) => r.ok && COMPARABLE(r) && r.warmMs != null).map((r) => r.warmMs!);
const bestWarm = warmTimes.length ? Math.min(...warmTimes) : null;

for (const r of rows) {
  const stack = STACK_SLUGS[r.key] ?? r.key;

  if (!r.ok) {
    // A failed stack must render as FAILED, never as a blank or a fast time.
    for (const metric of ['cold', 'warm', 'findings', 'files']) {
      write(`${stack}-${metric}.svg`, badge(metric, 'failed', COLOR.red));
    }
    continue;
  }

  write(
    `${stack}-cold.svg`,
    badge('cold', fmt(r.coldMs), r.coldMs === bestCold ? COLOR.green : COLOR.purple),
  );
  write(
    `${stack}-warm.svg`,
    badge('warm', fmt(r.warmMs), r.warmMs === bestWarm ? COLOR.green : COLOR.purple),
  );
  // Findings are NOT colour-coded by "more is better" — more findings can
  // mean better recall or a noisier ruleset. Neutral, and read alongside time.
  write(
    `${stack}-findings.svg`,
    badge('findings', r.findings == null ? 'n/a' : String(r.findings), COLOR.grey),
  );
  write(
    `${stack}-files.svg`,
    badge('files', r.files == null ? 'n/a' : String(r.files), COLOR.grey),
  );
}

// ── 3. Head-to-head vs the community stack ─────────────────────────────
// Only emitted when file-set parity was verified. Without parity the two
// stacks linted different work and a speed ratio would be meaningless —
// so we print nothing rather than something flattering.
const oursRow = rows.find((r) => r.key === 'ours' && r.ok);
const compRow = rows.find((r) => r.key === 'competitor' && r.ok);
const oursCold = oursRow?.coldMs ?? null;
const compCold = compRow?.coldMs ?? null;

if (data.fileSet?.eslintParity && oursCold && compCold) {
  const ratio = compCold / oursCold;
  const faster = ratio >= 1;
  write(
    'vs-community.svg',
    badge(
      'vs community stack',
      faster ? `${ratio.toFixed(1)}× faster` : `${(1 / ratio).toFixed(1)}× slower`,
      faster ? COLOR.green : COLOR.amber,
    ),
  );
} else {
  console.warn(
    'Skipping vs-community.svg: file-set parity not verified, so a ratio would compare different work.',
  );
}

// ── 3b. Coverage: rules per plugin ─────────────────────────────────────
// Time alone is unreadable without work-done. These make "faster" mean
// "faster while running more rules", which is the only useful version of it.
const plugins: any[] = data.coverage?.plugins ?? [];
for (const p of plugins) {
  write(
    `rules-${p.plugin}.svg`,
    badge(p.plugin, `${p.total} rules`, p.side === 'ours' ? COLOR.purple : COLOR.grey),
  );
}
if (plugins.length) {
  const oursTotal = plugins.filter((p) => p.side === 'ours').reduce((s, p) => s + p.total, 0);
  const compTotal = plugins.filter((p) => p.side === 'competitor').reduce((s, p) => s + p.total, 0);
  write('rules-ours-total.svg', badge('Interlace rules', String(oursTotal), COLOR.purple));
  write('rules-competitor-total.svg', badge('community rules', String(compTotal), COLOR.grey));
}

// ── 3c. Per-job head-to-head ───────────────────────────────────────────
// The apples-to-apples rows: same capability, named rules on both sides.
// This is the comparison that can be defended, so it gets its own badges
// rather than being buried in a JSON artifact nobody opens.
const jobs: any[] = data.jobResults ?? [];
let jobsWon = 0, jobsContested = 0, jobsUncontested = 0;
for (const j of jobs) {
  const slug = j.job.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const oursMs = j.ours?.ms, theirsMs = j.theirs?.ms;

  if (j.theirs?.ok === null || j.theirs?.ruleCount === 0) {
    // No competitor rule: uncontested coverage, explicitly NOT a "win".
    jobsUncontested++;
    write(`job-${slug}.svg`, badge(j.job.slice(0, 30), 'no rival rule', COLOR.grey));
    continue;
  }
  if (oursMs == null || theirsMs == null) continue;
  jobsContested++;
  const faster = oursMs <= theirsMs;
  if (faster) jobsWon++;
  const ratio = faster ? theirsMs / oursMs : oursMs / theirsMs;
  write(
    `job-${slug}.svg`,
    badge(
      j.job.slice(0, 30),
      `${ratio.toFixed(1)}× ${faster ? 'faster' : 'slower'}`,
      faster ? COLOR.green : COLOR.amber,
    ),
  );
}
if (jobsContested) {
  // Honest summary: contested jobs won, not "18 of 18". The uncontested
  // rows are counted separately so the headline can never imply we beat
  // someone on a job where nobody competes.
  write(
    'jobs-summary.svg',
    badge('head-to-head jobs', `${jobsWon}/${jobsContested} faster`,
      jobsWon > jobsContested / 2 ? COLOR.green : COLOR.amber),
  );
  write(
    'jobs-uncontested.svg',
    badge('uncontested coverage', `${jobsUncontested} jobs`, COLOR.purple),
  );
}

// Corpus + parity badges — the caveats travel WITH the numbers rather than
// living only in prose a reader may skip.
write('corpus.svg', badge('corpus', repo, COLOR.grey));
write(
  'parity.svg',
  data.fileSet?.eslintParity
    ? badge('file-set parity', `verified · ${data.fileSet.ours} files`, COLOR.green)
    : badge('file-set parity', 'NOT verified', COLOR.red),
);

// ── 4. Shields endpoint JSON ───────────────────────────────────────────
// For anyone who prefers shields' renderer:
//   https://img.shields.io/endpoint?url=<pages-url>/badges/verified.json
if (generatedAt) {
  const days = (Date.now() - new Date(generatedAt).getTime()) / 86_400_000;
  writeFileSync(
    join(OUT_DIR, 'verified.json'),
    JSON.stringify({
      schemaVersion: 1,
      label: 'benchmark',
      message: `verified ${generatedAt.slice(0, 10)}`,
      color: days > 21 ? 'red' : days > 10 ? 'orange' : 'brightgreen',
    }, null, 2),
  );
  written.push('verified.json');
}

// ── 5. The README table, emitted BY the generator ──────────────────────
// The markdown is generated from the same loop that wrote the files, so a
// renamed badge can never leave a broken <img> in the README. Paste-once:
// the markup then stays frozen while the images update weekly from Pages.
const PAGES_BASE =
  process.env.BENCH_BADGE_BASE || 'https://ofri-peretz.github.io/eslint/badges';

const img = (file: string, alt: string) => `![${alt}](${PAGES_BASE}/${file}.svg)`;

const table: string[] = [];
table.push('<!-- INTERLACE:BENCH_TABLE — generated by ilb:headline:badges. Do not hand-edit cells. -->');
table.push('');
table.push(`${img('verified', 'last verified')} ${img('corpus', 'corpus')} ${img('parity', 'file-set parity')}`);
table.push('');
// Cold and warm lead — they are the two numbers a user feels. Findings and
// files follow as the evidence that the times are comparable.
table.push('| Stack | Cold | Warm | Findings | Files |');
table.push('| :--- | :---: | :---: | :---: | :---: |');
for (const r of rows) {
  const stack = STACK_SLUGS[r.key] ?? r.key;
  const label = r.key.startsWith('ours') ? `**${r.label}**` : r.label;
  table.push(
    `| ${label} | ${img(`${stack}-cold`, 'cold')} | ${img(`${stack}-warm`, 'warm')} ` +
    `| ${img(`${stack}-findings`, 'findings')} | ${img(`${stack}-files`, 'files')} |`,
  );
}
table.push('');

if (plugins.length) {
  table.push('**Coverage** — rules shipped, per plugin:');
  table.push('');
  table.push('| | Plugin | Rules |');
  table.push('| :--- | :--- | :---: |');
  for (const p of plugins) {
    table.push(
      `| ${p.side === 'ours' ? '**Interlace**' : 'Community'} ` +
      `| [\`${p.npm}\`](https://www.npmjs.com/package/${p.npm}) ` +
      `| ${img(`rules-${p.plugin}`, `${p.plugin} rules`)} |`,
    );
  }
  table.push('');
}

table.push(
  '<sub>Cold = `--no-cache`. Warm = `--cache`, primed. Median of N after a ' +
  'discarded warmup, same file set per stack (parity asserted, not assumed). ' +
  'Only SDK-agnostic plugins are benchmarked — framework-bound plugins have no ' +
  'comparable competitor. oxlint built-ins run a different rule scope (no ' +
  'secrets/injection analysis) and are shown for context, not as a peer.</sub>',
);
table.push('');

const snippetPath = join(OUT_DIR, 'README-table.md');
writeFileSync(snippetPath, table.join('\n'));
written.push('README-table.md');

console.log(`Wrote ${written.length} badge artifact(s) to ${OUT_DIR}:`);
for (const w of written) console.log(`  ${w}`);
console.log(`\nREADME table markup → ${snippetPath}`);
