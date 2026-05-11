#!/usr/bin/env -S npx tsx
/**
 * Render the latest results/ilb-flagship/<date>.json (v2 schema) as a
 * comprehensive Markdown scorecard covering:
 *   - Latency (cold + warm) per stack
 *   - Cache effectiveness
 *   - Synthetic corpus precision/recall/F1 (where applicable)
 *   - OSS findings overlap (both / ours-only / theirs-only)
 *   - Sample findings — top 5 of each category, with file:line and message
 *   - Where competitors beat us — explicit theirs-only listings
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const RESULTS_DIR = resolve(REPO_ROOT, 'benchmarks/results/ilb-flagship');
const OUT = resolve(REPO_ROOT, 'benchmark-results/ilb-flagship-scorecard.md');

const files = readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) { console.error('No flagship results yet.'); process.exit(1); }
const latest = files[files.length - 1];
const data = JSON.parse(readFileSync(join(RESULTS_DIR, latest), 'utf8'));

const ms = (n) => (n == null ? '—' : `${n} ms`);
const f = (n) => (n == null ? '—' : String(n));
const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(0)}%`);

const lines = [];
lines.push('# ILB-Flagship Scorecard');
lines.push('');
lines.push(`> Per-rule × per-repo: latency (cached + uncached), findings, head-to-head overlap, and synthetic-corpus P/R/F1. Generated from \`${latest}\`.`);
lines.push('');
lines.push(`- **Generated**: ${data.runAt} · **Schema**: ${data.schema || 'v1'}`);
lines.push(`- **ESLint**: ${data.eslintVersion} · **oxlint**: ${data.oxlintVersion} · **Node**: ${data.nodeVersion}`);
lines.push(`- **OOS root**: \`${data.oosDir}\``);
lines.push('');

// ── Section 1: Latency ──────────────────────────────────────────────────
lines.push('## 1. Latency (cold → warm) and findings count');
lines.push('');
lines.push('| Rule | Repo | ⭐ | Tier | Ours cold | Ours warm | Ours findings | Comp cold | Comp warm | Comp findings | oxlint cold | oxlint warm | oxlint findings |');
lines.push('| :--- | :--- | ---: | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');

for (const r of data.results) {
  if (r.skipped) {
    lines.push(`| \`${r.rule}\` | ${r.repo} | — | — | — | — | _${r.skipped}_ | — | — | — | — | — | — |`);
    continue;
  }
  const o = r.runs?.oursEslint;
  const c = r.runs?.competitorEslint;
  const x = r.runs?.oxlintNative;
  lines.push(`| \`${r.rule}\` | ${r.repo} | ${r.starsK}K | ${r.tier} | ${ms(o?.cold?.ms)} | ${ms(o?.warm?.ms)} | ${f(o?.cold?.findingsCount)} | ${ms(c?.cold?.ms)} | ${ms(c?.warm?.ms)} | ${f(c?.cold?.findingsCount)} | ${ms(x?.cold?.ms)} | ${ms(x?.warm?.ms)} | ${f(x?.cold?.findingsCount)} |`);
}

// ── Section 2: Cache effectiveness ──────────────────────────────────────
lines.push('');
lines.push('## 2. Cache effectiveness (median across rules)');
lines.push('');
lines.push('| Stack | Median cold | Median warm | Δ | Cache benefit |');
lines.push('| :--- | ---: | ---: | ---: | ---: |');

const median = (arr) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const stacks = {
  'Ours (ESLint)': data.results.map((r) => r.runs?.oursEslint).filter(Boolean),
  'Competitor (ESLint)': data.results.map((r) => r.runs?.competitorEslint).filter(Boolean),
  'oxlint native (competitor)': data.results.map((r) => r.runs?.oxlintNative).filter(Boolean),
};
for (const [name, runs] of Object.entries(stacks)) {
  const cold = median(runs.map((r) => r.cold?.ms).filter(Number.isFinite));
  const warm = median(runs.map((r) => r.warm?.ms).filter(Number.isFinite));
  if (cold == null) { lines.push(`| ${name} | — | — | — | — |`); continue; }
  const benefit = cold ? Math.round(((cold - warm) / cold) * 100) : 0;
  lines.push(`| ${name} | ${cold} ms | ${warm} ms | ${cold - warm} ms | ${benefit}% |`);
}

// ── Section 3: Synthetic corpus P/R/F1 ──────────────────────────────────
const withCorpus = data.results.filter((r) => r.corpus);
if (withCorpus.length > 0) {
  lines.push('');
  lines.push('## 3. Synthetic corpus — true precision / recall / F1');
  lines.push('');
  lines.push('Labeled fixtures from `benchmarks/corpus/CWE-NNN/{vulnerable,safe}`. Tiny — 3 vuln + 3 safe per CWE — but ground-truthed.');
  lines.push('');
  lines.push('| Rule | CWE | Stack | Precision | Recall | F1 | TP | FP | FN | TN |');
  lines.push('| :--- | :--- | :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const r of withCorpus) {
    const showRow = (label, x) => {
      if (!x) return;
      const c = x.confusion;
      lines.push(`| \`${r.rule}\` | ${r.corpus.cwe} | ${label} | ${pct(x.precision)} | ${pct(x.recall)} | ${x.f1?.toFixed(2) ?? '—'} | ${c.tp} | ${c.fp} | ${c.fn} | ${c.tn} |`);
    };
    showRow('ours', r.corpus.ours);
    if (r.corpus.competitor) showRow('competitor', r.corpus.competitor);
  }
}

// ── Section 4: OSS findings overlap (head-to-head) ──────────────────────
const withOverlap = data.results.filter((r) => r.overlap);
if (withOverlap.length > 0) {
  lines.push('');
  lines.push('## 4. OSS findings overlap — both / ours-only / theirs-only');
  lines.push('');
  lines.push('Set ops on `(file, line)` keys between our cold-run findings and the competitor\'s on the same OSS repo.');
  lines.push('');
  lines.push('- **both** = same file:line flagged by both rules → likely true positive');
  lines.push('- **ours-only** = we flagged, they did not → either better recall or our FP (manual triage required)');
  lines.push('- **theirs-only** = they flagged, we did not → either their better recall or their FP (this is "where they beat us")');
  lines.push('');
  lines.push('| Rule | Repo | Both | Ours-only | Theirs-only |');
  lines.push('| :--- | :--- | ---: | ---: | ---: |');
  for (const r of withOverlap) {
    const c = r.overlap.counts;
    lines.push(`| \`${r.rule}\` | ${r.repo} | ${c.both} | ${c.oursOnly} | ${c.theirsOnly} |`);
  }
}

// ── Section 5: Sample findings — where they beat us ─────────────────────
const samplesWhereTheyWin = withOverlap.filter((r) => r.overlap.counts.theirsOnly > 0);
if (samplesWhereTheyWin.length > 0) {
  lines.push('');
  lines.push('## 5. Where competitors beat us (theirs-only samples, top 5 each)');
  lines.push('');
  lines.push('Each row is a finding the competitor caught that ours missed. Triage to determine FN-on-our-side vs FP-on-theirs.');
  lines.push('');
  for (const r of samplesWhereTheyWin) {
    lines.push(`### \`${r.rule}\` on ${r.repo} — ${r.overlap.counts.theirsOnly} theirs-only finding(s)`);
    lines.push('');
    lines.push('| File | Line | Message |');
    lines.push('| :--- | ---: | :--- |');
    for (const s of r.overlap.samples.theirsOnly) {
      lines.push(`| \`${s.file}\` | ${s.line ?? '—'} | ${(s.message || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' · ')} |`);
    }
    lines.push('');
  }
}

// ── Section 6: Where we beat them (ours-only samples) ───────────────────
const samplesWhereWeWin = withOverlap.filter((r) => r.overlap.counts.oursOnly > 0);
if (samplesWhereWeWin.length > 0) {
  lines.push('');
  lines.push('## 6. Where we beat competitors (ours-only samples, top 5 each)');
  lines.push('');
  lines.push('Each row is a finding ours caught that theirs missed. Triage same way — could be a real recall win or our FP.');
  lines.push('');
  for (const r of samplesWhereWeWin) {
    lines.push(`### \`${r.rule}\` on ${r.repo} — ${r.overlap.counts.oursOnly} ours-only finding(s)`);
    lines.push('');
    lines.push('| File | Line | Message |');
    lines.push('| :--- | ---: | :--- |');
    for (const s of r.overlap.samples.oursOnly) {
      lines.push(`| \`${s.file}\` | ${s.line ?? '—'} | ${(s.message || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' · ')} |`);
    }
    lines.push('');
  }
}

// ── Section 7: Top findings on green-field rules ────────────────────────
const greenfield = data.results.filter((r) => !r.overlap && r.runs?.oursEslint?.cold?.findings?.length > 0);
if (greenfield.length > 0) {
  lines.push('');
  lines.push('## 7. Green-field rule samples (no competitor)');
  lines.push('');
  for (const r of greenfield) {
    const f = r.runs.oursEslint.cold.findings;
    lines.push(`### \`${r.rule}\` on ${r.repo} — ${f.length} finding(s) (showing top 5)`);
    lines.push('');
    lines.push('| File | Line | Message |');
    lines.push('| :--- | ---: | :--- |');
    for (const s of f.slice(0, 5)) {
      lines.push(`| \`${s.file}\` | ${s.line ?? '—'} | ${(s.message || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' · ')} |`);
    }
    lines.push('');
  }
}

// ── Reading guide ──────────────────────────────────────────────────────
lines.push('---');
lines.push('');
lines.push('## How to read this');
lines.push('');
lines.push('- **Latency** is single-shot. For SLO-grade numbers use median-of-N (TODO: `--repeat=N`).');
lines.push('- **Cold** = `eslint --no-cache`. **Warm** = `eslint --cache --cache-location <stable>` after a prior cold run.');
lines.push('- **oxlint** caches implicitly (file-mtime + content hash). The "warm" column is the second consecutive run.');
lines.push('- **Findings count** is filtered by the rule\'s own ID prefix; parser errors and other rules are excluded.');
lines.push('- **Synthetic corpus P/R/F1** are the only numbers here that are ground-truthed. Treat OSS findings as evidence for triage, not as P/R numbers.');
lines.push('- **Overlap**: file:line keying. Same line, same file = "both". A theirs-only finding may be a real FN on our side OR a competitor FP — triage required.');

writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`Wrote ${OUT}`);
