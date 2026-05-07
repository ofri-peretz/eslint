#!/usr/bin/env node

/**
 * ILB Audit — competitive-landscape audit across every bench.
 *
 * For each bench, reports:
 *   - what dimension it measures
 *   - who/what we're competing against (plugin matrix or model matrix)
 *   - whether the corpus exists, has fixtures, has configs
 *   - the latest result file + score (when available)
 *   - readiness verdict (Ready / Gaps / Not implemented)
 *
 * This is the answer to "who and what tools are we competing with in each
 * benchmark?" — read directly from run.js sources + result files, not
 * from a static doc that could drift.
 *
 * Usage:
 *   node scripts/ilb-audit.mjs                    # human-readable report
 *   node scripts/ilb-audit.mjs --json             # machine-readable
 *   node scripts/ilb-audit.mjs --bench=ilb-arena  # focus on one bench
 *   node scripts/ilb-audit.mjs --ci               # exit 1 if any bench has gaps
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BENCH_ROOT = path.join(ROOT, 'benchmarks');
const BENCH_DIR = path.join(BENCH_ROOT, 'benchmarks');
const RESULTS_DIR = path.join(BENCH_ROOT, 'results');
const WILD_RESULTS = path.join(ROOT, 'benchmark-results');

const args = process.argv.slice(2);
const opt = (n) => {
  const eq = args.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${n}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const flag = (n) => args.includes(`--${n}`);
const focus = opt('bench');
const EMIT_JSON = flag('json');
const CI = flag('ci');

// ── Bench definitions — what to audit and where to look for competitors ──

const BENCHES = [
  {
    id: 'ilb-juliet',
    name: 'ILB-Juliet',
    fullName: 'Interlace Juliet',
    dimension: 'Synthetic CWE detection accuracy',
    competitorSource: { type: 'corpus', dir: 'corpus' },
    expectedCorpusPath: 'corpus',
    benchDir: 'suites/ilb-juliet',
    resultsDir: 'results/ilb-juliet',
    industryParallel: 'NIST SARD/Juliet, OWASP Benchmark v1.2',
  },
  {
    id: 'ilb-arena',
    name: 'ILB-Arena',
    fullName: 'Interlace Arena',
    dimension: 'Head-to-head vs competitor security plugins',
    competitorSource: { type: 'runfile', file: 'suites/ilb-arena/run.js', symbol: 'ALL_PLUGINS' },
    benchDir: 'suites/ilb-arena',
    resultsDir: 'results/ilb-arena',
    industryParallel: 'OWASP Benchmark Accuracy Score (BAS = TPR − FPR)',
  },
  {
    id: 'ilb-arena-quality',
    name: 'ILB-Arena (quality)',
    fullName: 'Interlace Arena — Quality variant',
    dimension: 'Head-to-head vs competitor quality plugins',
    competitorSource: { type: 'runfile', file: 'suites/ilb-arena-quality/run.js', symbol: 'ALL_PLUGINS' },
    benchDir: 'suites/ilb-arena-quality',
    resultsDir: 'results/ilb-arena-quality',
    industryParallel: '(adapted OWASP Benchmark format)',
  },
  {
    id: 'ilb-wild',
    name: 'ILB-Wild',
    fullName: 'Interlace Wild',
    dimension: 'Findings on popular OSS (no competitors — exposure metric)',
    competitorSource: { type: 'wild' },
    benchDir: 'scripts/ilb-wild.mjs',
    resultsDir: '../../benchmark-results',
    industryParallel: '(none — we define the JS standard)',
  },
  {
    id: 'ilb-edge',
    name: 'ILB-Edge',
    fullName: 'Interlace Edge',
    dimension: 'FP resilience on adversarial-real codebases (no competitors — FP audit)',
    competitorSource: { type: 'wild', filterFpEdge: true },
    benchDir: 'scripts/ilb-wild.mjs --fp-corpus',
    resultsDir: '../../benchmark-results',
    industryParallel: 'Adversarial GLUE / CheckList',
  },
  {
    id: 'ilb-perf-import',
    name: 'ILB-Perf (import)',
    fullName: 'Interlace Perf — import plugin',
    dimension: 'Lint throughput: import-next vs eslint-plugin-import',
    competitorSource: { type: 'configs-dir', dir: 'suites/ilb-perf-import/configs' },
    benchDir: 'suites/ilb-perf-import',
    resultsDir: 'results/ilb-perf-import',
    industryParallel: 'MLPerf Inference / SPEC CPU (versioned scenarios)',
  },
  {
    id: 'ilb-cov',
    name: 'ILB-Cov',
    fullName: 'Interlace Coverage',
    dimension: 'Rule activation rate (derived — no competitors)',
    competitorSource: { type: 'derived' },
    benchDir: '(derived from ILB-Wild + ILB-Juliet)',
    resultsDir: 'results/ilb-cov',
    industryParallel: '(analogous to mutation testing coverage)',
  },
  {
    id: 'ilb-ai',
    name: 'ILB-AI',
    fullName: 'Interlace AI',
    dimension: 'Vulnerability detection on LLM-generated code',
    competitorSource: {
      type: 'multi-runfile',
      files: [
        'suites/ilb-ai/run.js',
        'suites/ilb-ai/run-antigravity.js',
        'suites/ilb-ai/run-hydra.js',
      ],
    },
    benchDir: 'suites/ilb-ai',
    resultsDir: 'results/ilb-ai',
    industryParallel: 'HumanEval / SWE-Bench (task design); WMDP (security)',
  },
];

// ── Competitor extraction ───────────────────────────────────────────

function extractCompetitorsFromRunFile(absPath, symbolName = 'ALL_PLUGINS') {
  if (!fs.existsSync(absPath)) return null;
  const src = fs.readFileSync(absPath, 'utf-8');

  // Find the array literal assigned to the symbol.
  const re = new RegExp(`(?:const|let|var)\\s+${symbolName}\\s*=\\s*\\[`);
  const m = re.exec(src);
  if (!m) return null;

  // Walk forward and collect balanced []
  let depth = 0;
  const start = m.index + m[0].length - 1; // points at '['
  let end = -1;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) return null;
  const block = src.slice(start, end);

  // Pull out objects inside.
  const items = [];
  const objRe = /\{[\s\S]*?\}/g;
  let depth2 = 0;
  let buf = '';
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    if (c === '{') { depth2++; buf += c; }
    else if (c === '}') { depth2--; buf += c; if (depth2 === 0 && buf.trim()) { items.push(buf); buf = ''; } }
    else if (depth2 > 0) buf += c;
  }

  return items.map((item) => {
    const get = (key) => {
      const re2 = new RegExp(`${key}\\s*:\\s*(['\"])([^'\"]*)\\1`);
      const mm = re2.exec(item);
      return mm ? mm[2] : null;
    };
    const getNum = (key) => {
      const re2 = new RegExp(`${key}\\s*:\\s*(\\d+)`);
      const mm = re2.exec(item);
      return mm ? parseInt(mm[1], 10) : null;
    };
    return {
      name: get('name'),
      displayName: get('displayName') || get('name'),
      rules: getNum('rules'),
      lastUpdated: get('lastUpdated'),
      weeklyDownloads: get('weeklyDownloads'),
      category: get('category'),
    };
  }).filter((x) => x.name);
}

function extractAIModels(files) {
  const models = new Set();
  for (const f of files) {
    const abs = path.join(BENCH_ROOT, f);
    if (!fs.existsSync(abs)) continue;
    const src = fs.readFileSync(abs, 'utf-8');
    // Match displayName: "..." entries within MODELS arrays.
    const re = /displayName:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) models.add(m[1]);
  }
  return [...models];
}

// ── Result auditing ─────────────────────────────────────────────────

function latestResultFile(absDir) {
  if (!fs.existsSync(absDir)) return null;
  const entries = fs.readdirSync(absDir).filter((e) => e.endsWith('.json'));
  const dated = entries.filter((e) => /^\d{4}-\d{2}-\d{2}\b/.test(e)).sort().reverse();
  if (dated.length > 0) return path.join(absDir, dated[0]);
  if (entries.length > 0) return path.join(absDir, entries.sort().reverse()[0]);
  return null;
}

function latestWildSummary() {
  if (!fs.existsSync(WILD_RESULTS)) return null;
  const dirs = fs.readdirSync(WILD_RESULTS)
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e))
    .sort().reverse();
  for (const d of dirs) {
    const p = path.join(WILD_RESULTS, d, 'summary.json');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// ── Audit per-bench ─────────────────────────────────────────────────

function auditBench(b) {
  const out = {
    id: b.id,
    name: b.name,
    fullName: b.fullName,
    dimension: b.dimension,
    industryParallel: b.industryParallel,
    benchDir: b.benchDir,
    resultsDir: b.resultsDir,
    competitors: [],
    competitorCount: 0,
    fixtures: { exists: null, count: null },
    configs: { exists: null, count: null },
    latestResult: null,
    latestResultDate: null,
    gaps: [],
    verdict: 'unknown',
  };

  // Competitor extraction.
  const cs = b.competitorSource;
  if (cs.type === 'runfile') {
    const abs = path.join(BENCH_ROOT, cs.file);
    const comps = extractCompetitorsFromRunFile(abs, cs.symbol);
    if (comps) {
      out.competitors = comps;
      out.competitorCount = comps.length;
    } else {
      out.gaps.push(`competitor extraction failed at ${cs.file}`);
    }
  } else if (cs.type === 'multi-runfile') {
    out.competitors = extractAIModels(cs.files).map((displayName) => ({ displayName, category: 'LLM' }));
    out.competitorCount = out.competitors.length;
  } else if (cs.type === 'corpus') {
    const corpusPath = path.join(BENCH_ROOT, cs.dir);
    if (fs.existsSync(corpusPath)) {
      const cwes = fs.readdirSync(corpusPath).filter((e) => /^CWE-\d+$/.test(e));
      out.competitors = cwes.map((c) => ({ displayName: c, category: 'CWE corpus' }));
      out.competitorCount = cwes.length;
    } else {
      out.gaps.push(`corpus dir missing: ${cs.dir}`);
    }
  } else if (cs.type === 'configs-dir') {
    const cdir = path.join(BENCH_ROOT, cs.dir);
    if (fs.existsSync(cdir)) {
      const configs = fs.readdirSync(cdir).filter((f) => f.endsWith('.config.js'));
      out.competitors = configs.map((c) => ({
        displayName: c.replace(/\.config\.js$/, ''),
        category: 'plugin variant',
      }));
      out.competitorCount = configs.length;
    } else {
      out.gaps.push(`configs dir missing: ${cs.dir}`);
    }
  } else if (cs.type === 'wild') {
    out.competitors = [{ displayName: '(no competitors — exposure/FP-audit)', category: 'self-only' }];
    out.competitorCount = 0;
  } else if (cs.type === 'derived') {
    out.competitors = [{ displayName: '(derived from ILB-Wild + ILB-Juliet)', category: 'derived' }];
    out.competitorCount = 0;
  }

  // Fixtures + configs auditing — meaningful only for benches that ship a
  // local corpus. AI is prompt-based (no fixtures/configs by design); Wild
  // and Edge use a remote corpus (cloned repos).
  const skipFixtureAudit = ['ilb-ai', 'ilb-wild', 'ilb-edge', 'ilb-cov'].includes(b.id);
  if (b.benchDir.startsWith('suites/') && !skipFixtureAudit) {
    const benchAbs = path.join(BENCH_ROOT, b.benchDir);
    const fixturesDir = path.join(benchAbs, 'fixtures');
    const configsDir = path.join(benchAbs, 'configs');

    if (fs.existsSync(fixturesDir)) {
      const items = fs.readdirSync(fixturesDir);
      out.fixtures = { exists: true, count: items.length, list: items.slice(0, 10) };
      // ILB-Juliet's corpus lives at benchmarks/corpus/CWE-*/, not in
      // its own fixtures/. Don't double-flag.
      if (items.length === 0 && b.id !== 'ilb-juliet') out.gaps.push('fixtures/ is empty');
      if (b.id === 'ilb-juliet' && items.length === 0)
        out.gaps.push('runner not implemented — corpus exists at corpus/CWE-* but no run.js wires it');
    } else {
      out.fixtures = { exists: false, count: 0 };
      if (b.id !== 'ilb-juliet') out.gaps.push('fixtures/ missing');
    }

    if (fs.existsSync(configsDir)) {
      const items = fs.readdirSync(configsDir);
      out.configs = { exists: true, count: items.length };
      if (items.length === 0 && cs.type !== 'corpus') out.gaps.push('configs/ is empty');
    } else {
      out.configs = { exists: false, count: 0 };
    }
  }

  // Latest result.
  if (b.id === 'ilb-wild' || b.id === 'ilb-edge' || b.id === 'ilb-cov') {
    const wp = latestWildSummary();
    if (wp) {
      out.latestResult = path.relative(ROOT, wp);
      try {
        const j = JSON.parse(fs.readFileSync(wp, 'utf-8'));
        out.latestResultDate = j.date;
      } catch {}
    } else {
      out.gaps.push('no ILB-Wild summary yet — run `npm run ilb:wild`');
    }
  } else {
    const resAbs = path.join(BENCH_ROOT, b.resultsDir);
    const lf = latestResultFile(resAbs);
    if (lf) {
      out.latestResult = path.relative(ROOT, lf);
      try {
        const j = JSON.parse(fs.readFileSync(lf, 'utf-8'));
        out.latestResultDate = (j.timestamp || j.date || '').slice(0, 10) || null;
      } catch {}
    } else {
      out.gaps.push(`no result files in ${b.resultsDir}/`);
    }
  }

  // Verdict.
  if (out.competitorCount === 0 && cs.type !== 'wild' && cs.type !== 'derived') {
    out.verdict = 'Not implemented';
  } else if (out.gaps.length === 0) {
    out.verdict = 'Ready';
  } else {
    out.verdict = 'Gaps';
  }

  return out;
}

// ── Run ─────────────────────────────────────────────────────────────

const audited = BENCHES
  .filter((b) => !focus || b.id === focus)
  .map(auditBench);

if (EMIT_JSON) {
  console.log(JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      benches: audited,
    },
    null,
    2,
  ));
  process.exit(audited.some((b) => b.gaps.length) && CI ? 1 : 0);
}

// Human-readable report.
const VERDICT_ICON = { Ready: '✅', Gaps: '⚠️ ', 'Not implemented': '❌', unknown: '❓' };

console.log(`\n🔬 ILB Suite Audit — ${audited.length} bench${audited.length === 1 ? '' : 'es'}`);
console.log(`   ${new Date().toISOString().split('T')[0]} · methodology: benchmarks/ILB_NAMING.md\n`);

console.log('## Top-line\n');
console.log('| Bench | Dimension | Competitors | Last result | Verdict |');
console.log('|---|---|---|---|---|');
for (const b of audited) {
  const compStr = b.competitorCount > 0
    ? `${b.competitorCount} (${b.competitors.slice(0, 3).map((c) => c.displayName).join(', ')}${b.competitorCount > 3 ? '…' : ''})`
    : (b.competitors[0]?.displayName || '—');
  console.log(
    `| ${b.name} | ${b.dimension.length > 50 ? b.dimension.slice(0, 47) + '…' : b.dimension} | ${compStr} | ${b.latestResultDate || '—'} | ${VERDICT_ICON[b.verdict]} ${b.verdict} |`,
  );
}

for (const b of audited) {
  console.log(`\n### ${b.name} — ${b.fullName}\n`);
  console.log(`**Dimension:** ${b.dimension}`);
  console.log(`**Industry parallel:** ${b.industryParallel}`);
  console.log(`**Bench dir:** ${b.benchDir}`);
  console.log(`**Latest result:** ${b.latestResult || '_(none)_'}${b.latestResultDate ? ` (${b.latestResultDate})` : ''}`);
  if (b.fixtures.exists !== null) {
    console.log(
      `**Fixtures:** ${b.fixtures.exists ? `${b.fixtures.count} entries` : 'missing'}`,
    );
  }
  if (b.configs.exists !== null) {
    console.log(
      `**Configs:** ${b.configs.exists ? `${b.configs.count} files` : 'missing'}`,
    );
  }

  if (b.competitors.length > 0 && b.competitorCount > 0) {
    console.log(`\n**Competitors (${b.competitorCount}):**\n`);
    console.log('| # | Plugin / Model | Rules | Active | Weekly DLs | Category |');
    console.log('|---|---|---|---|---|---|');
    b.competitors.forEach((c, i) => {
      console.log(
        `| ${i + 1} | ${c.displayName} | ${c.rules ?? '—'} | ${c.lastUpdated ?? '—'} | ${c.weeklyDownloads ?? '—'} | ${c.category ?? '—'} |`,
      );
    });
  }

  if (b.gaps.length) {
    console.log(`\n**Gaps:**`);
    for (const g of b.gaps) console.log(`  - ⚠️  ${g}`);
  }
}

console.log('');

const anyGaps = audited.some((b) => b.gaps.length > 0);
if (CI && anyGaps) {
  console.log(`🚫 Audit found gaps in ${audited.filter((b) => b.gaps.length).length} bench(es). Exiting non-zero (--ci).`);
  process.exit(1);
}
console.log(
  anyGaps
    ? `✨ Audit complete — ${audited.filter((b) => b.gaps.length).length} bench(es) with gaps. Run with --ci to gate.`
    : '✨ Audit complete — all benches Ready.',
);
