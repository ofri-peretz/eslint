#!/usr/bin/env node

/**
 * ILB Fixture Coverage — addresses three validation limitations of the
 * synthetic-corpus benches at once:
 *
 *  1. **Inter-rater agreement** (limitation #3 in the audit). For each
 *     fixture, count how many of N competitor plugins agree with the
 *     fixture's label. Compute a per-CWE agreement rate. OWASP Benchmark
 *     publishes a similar number — % of test cases where ≥ 3 tools agree.
 *
 *  2. **Over-fit detection** (limitation #4 / #5 — fixtures + rules built
 *     by overlapping people). Fixtures where ONLY Interlace fires (and
 *     every other competitor stays silent) are suspicious — either we
 *     genuinely cover something competitors miss, OR the fixture is
 *     written specifically to match our rule. Surface these for human
 *     triage.
 *
 *  3. **Coverage breadth**. Per-CWE: count of vulnerable fixtures, count
 *     of safe fixtures. Flags CWEs that don't have ≥ 2 fixtures of each.
 *
 * Inputs are the latest ILB-Arena and ILB-Juliet result files. Output is
 * a markdown report at benchmarks/COVERAGE_REPORT.md and (optionally)
 * stdout / JSON.
 *
 * Usage:
 *   node scripts/ilb-fixture-coverage.mjs            # write the report
 *   node scripts/ilb-fixture-coverage.mjs --print
 *   node scripts/ilb-fixture-coverage.mjs --json
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BENCH_RESULTS = path.join(ROOT, 'benchmarks', 'results');
const CORPUS_DIR = path.join(ROOT, 'benchmarks', 'corpus');
const OUT_PATH = path.join(ROOT, 'benchmarks', 'COVERAGE_REPORT.md');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const PRINT = flag('print');
const EMIT_JSON = flag('json');

// ── Latest result files ─────────────────────────────────────────────

function latestDated(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir).filter((e) => /^\d{4}-\d{2}-\d{2}\.json$/.test(e));
  if (entries.length === 0) return null;
  return path.join(dir, entries.sort().reverse()[0]);
}

const arenaPath = latestDated(path.join(BENCH_RESULTS, 'ilb-arena'));
const julietPath = latestDated(path.join(BENCH_RESULTS, 'ilb-juliet'));

if (!arenaPath || !julietPath) {
  console.error('Need latest ilb-arena and ilb-juliet results. Run those benches first.');
  process.exit(2);
}
const arena = JSON.parse(fs.readFileSync(arenaPath, 'utf-8'));
const juliet = JSON.parse(fs.readFileSync(julietPath, 'utf-8'));

// ── Inter-rater agreement on Juliet (per-fixture, per-tool) ────────

function julietAgreement() {
  // Build a fixture × tool matrix:
  //   tools = list of plugins in the result
  //   for each fixture (cwe + filename), each tool reports detected? (1/0)
  //   ground truth: expectedVulnerable
  const cweRows = [];
  for (const [cwe, info] of Object.entries(juliet.plugins?.interlace?.perCwe ?? {})) {
    for (const f of info.fixtures) {
      cweRows.push({ cwe, file: f.file, expectedVulnerable: f.expectedVulnerable, perTool: {} });
    }
  }
  // For each plugin, fill in detected={true|false} on each fixture
  for (const [pluginName, pluginData] of Object.entries(juliet.plugins ?? {})) {
    if (!pluginData.perCwe) continue;
    for (const [cwe, info] of Object.entries(pluginData.perCwe)) {
      for (const f of info.fixtures) {
        const row = cweRows.find((r) => r.cwe === cwe && r.file === f.file);
        if (row) row.perTool[pluginName] = (f.findings ?? 0) > 0;
      }
    }
  }

  const tools = Object.keys(juliet.plugins ?? {});

  // Per-fixture: how many tools matched the label?
  const perFixture = cweRows.map((r) => {
    const correct = tools.filter((t) => {
      const detected = r.perTool[t] ?? false;
      return r.expectedVulnerable ? detected : !detected;
    });
    return { ...r, agreementCount: correct.length, totalTools: tools.length, correctTools: correct };
  });

  // % of fixtures where ≥ 3 tools agree on the label (OWASP-style)
  const totalFixtures = perFixture.length;
  const fixtures3PlusAgree = perFixture.filter((r) => r.agreementCount >= 3).length;
  const fixturesAllAgree = perFixture.filter((r) => r.agreementCount === r.totalTools).length;

  // Cohen's kappa for Interlace vs each competitor on Juliet
  const kappas = {};
  for (const tool of tools) {
    if (tool === 'interlace') continue;
    const data = perFixture
      .filter((r) => r.perTool.interlace !== undefined && r.perTool[tool] !== undefined)
      .map((r) => ({ a: !!r.perTool.interlace, b: !!r.perTool[tool] }));
    if (data.length === 0) {
      kappas[tool] = null;
      continue;
    }
    const n = data.length;
    const a1b1 = data.filter((d) => d.a && d.b).length;
    const a0b0 = data.filter((d) => !d.a && !d.b).length;
    const a1b0 = data.filter((d) => d.a && !d.b).length;
    const a0b1 = data.filter((d) => !d.a && d.b).length;
    const Po = (a1b1 + a0b0) / n;
    const aPos = (a1b1 + a1b0) / n;
    const bPos = (a1b1 + a0b1) / n;
    const Pe = aPos * bPos + (1 - aPos) * (1 - bPos);
    const kappa = Pe === 1 ? 1 : (Po - Pe) / (1 - Pe);
    kappas[tool] = +kappa.toFixed(3);
  }

  // Over-fit detection: fixtures Interlace caught alone (no competitor agreed with the same VULNERABLE label)
  const onlyInterlace = perFixture.filter(
    (r) =>
      r.expectedVulnerable &&
      r.perTool.interlace === true &&
      Object.entries(r.perTool).filter(([k, v]) => k !== 'interlace' && v).length === 0,
  );

  return {
    totalFixtures,
    tools,
    fixtures3PlusAgree,
    fixturesAllAgree,
    pctFixtures3PlusAgree: +((fixtures3PlusAgree / totalFixtures) * 100).toFixed(1),
    pctFixturesAllAgree: +((fixturesAllAgree / totalFixtures) * 100).toFixed(1),
    kappas,
    onlyInterlace: onlyInterlace.map((r) => ({ cwe: r.cwe, file: r.file })),
  };
}

// ── Inter-rater on ILB-Arena (function-level) ──────────────────────

function arenaAgreement() {
  // Each plugin's metrics include detectedVulnerabilities + falsePositives.
  // Build fixture × tool: did this fixture get detected by the tool?
  const allFixtures = new Set();
  for (const p of Object.values(arena.plugins ?? {})) {
    for (const f of p.metrics?.detectedVulnerabilities ?? []) allFixtures.add(['vuln', f].join('::'));
    for (const f of p.metrics?.missedVulnerabilities ?? []) allFixtures.add(['vuln', f].join('::'));
    for (const f of p.metrics?.falsePositives ?? []) allFixtures.add(['safe', f].join('::'));
  }
  const tools = Object.keys(arena.plugins ?? {});

  const rows = [];
  for (const fxKey of allFixtures) {
    const [kind, name] = fxKey.split('::');
    const expectedVulnerable = kind === 'vuln';
    const perTool = {};
    for (const t of tools) {
      const m = arena.plugins[t].metrics ?? {};
      if (expectedVulnerable) {
        perTool[t] = (m.detectedVulnerabilities ?? []).includes(name);
      } else {
        perTool[t] = (m.falsePositives ?? []).includes(name);
      }
    }
    rows.push({ name, expectedVulnerable, perTool });
  }

  const total = rows.length;
  const agreeCount = (r) =>
    tools.filter((t) => (r.expectedVulnerable ? r.perTool[t] : !r.perTool[t])).length;
  const fixtures3PlusAgree = rows.filter((r) => agreeCount(r) >= 3).length;
  const fixturesAllAgree = rows.filter((r) => agreeCount(r) === tools.length).length;

  // Cohen's kappa for Interlace vs each competitor on Arena
  const kappas = {};
  for (const tool of tools) {
    if (tool === 'interlace') continue;
    const data = rows.map((r) => ({ a: !!r.perTool.interlace, b: !!r.perTool[tool] }));
    if (data.length === 0) { kappas[tool] = null; continue; }
    const n = data.length;
    const a1b1 = data.filter((d) => d.a && d.b).length;
    const a0b0 = data.filter((d) => !d.a && !d.b).length;
    const a1b0 = data.filter((d) => d.a && !d.b).length;
    const a0b1 = data.filter((d) => !d.a && d.b).length;
    const Po = (a1b1 + a0b0) / n;
    const aPos = (a1b1 + a1b0) / n;
    const bPos = (a1b1 + a0b1) / n;
    const Pe = aPos * bPos + (1 - aPos) * (1 - bPos);
    const kappa = Pe === 1 ? 1 : (Po - Pe) / (1 - Pe);
    kappas[tool] = +kappa.toFixed(3);
  }

  const onlyInterlace = rows.filter(
    (r) =>
      r.expectedVulnerable &&
      r.perTool.interlace === true &&
      Object.entries(r.perTool).filter(([k, v]) => k !== 'interlace' && v).length === 0,
  );

  return {
    totalFixtures: total,
    tools,
    fixtures3PlusAgree,
    fixturesAllAgree,
    pctFixtures3PlusAgree: total ? +((fixtures3PlusAgree / total) * 100).toFixed(1) : 0,
    pctFixturesAllAgree: total ? +((fixturesAllAgree / total) * 100).toFixed(1) : 0,
    kappas,
    onlyInterlace: onlyInterlace.map((r) => r.name),
  };
}

// ── Coverage breadth (Juliet only) ─────────────────────────────────

function coverageBreadth() {
  if (!fs.existsSync(CORPUS_DIR)) return { cwes: [], gaps: [] };
  const cwes = fs.readdirSync(CORPUS_DIR).filter((d) => /^CWE-\d+$/.test(d)).sort();
  const cweData = cwes.map((cwe) => {
    const v = path.join(CORPUS_DIR, cwe, 'vulnerable');
    const s = path.join(CORPUS_DIR, cwe, 'safe');
    const vuln = fs.existsSync(v) ? fs.readdirSync(v).filter((f) => /\.(js|ts)x?$/.test(f)).length : 0;
    const safe = fs.existsSync(s) ? fs.readdirSync(s).filter((f) => /\.(js|ts)x?$/.test(f)).length : 0;
    return { cwe, vulnerable: vuln, safe };
  });
  const gaps = cweData.filter((c) => c.vulnerable < 2 || c.safe < 2);
  return { cwes: cweData, gaps };
}

// ── Compose ────────────────────────────────────────────────────────

const julietRes = julietAgreement();
const arenaRes = arenaAgreement();
const breadth = coverageBreadth();

const summary = {
  generatedAt: new Date().toISOString(),
  juliet: julietRes,
  arena: arenaRes,
  coverageBreadth: breadth,
};

if (EMIT_JSON) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const md = renderMarkdown(summary);
fs.writeFileSync(OUT_PATH, md);
console.log(`✅ ${path.relative(ROOT, OUT_PATH)}`);
if (PRINT) console.log('\n' + md);

function kappaTable(kappas) {
  const rows = Object.entries(kappas)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, v]) => `| ${k} | ${v == null ? '—' : v} | ${interpretKappa(v)} |`)
    .join('\n');
  return rows;
}
function interpretKappa(k) {
  if (k == null) return '—';
  if (k < 0) return 'worse than chance';
  if (k < 0.2) return 'slight';
  if (k < 0.4) return 'fair';
  if (k < 0.6) return 'moderate';
  if (k < 0.8) return 'substantial';
  if (k < 1) return 'almost perfect';
  return 'perfect';
}

function renderMarkdown(s) {
  const today = new Date().toISOString().split('T')[0];
  const julietKappaRows = kappaTable(s.juliet.kappas);
  const arenaKappaRows = kappaTable(s.arena.kappas);

  const breadthRows = s.coverageBreadth.cwes
    .map((c) => `| ${c.cwe} | ${c.vulnerable} | ${c.safe} | ${c.vulnerable < 2 || c.safe < 2 ? '⚠️ thin' : '✓'} |`)
    .join('\n');

  const onlyJuliet = s.juliet.onlyInterlace.map((x) => `- ${x.cwe} / ${x.file}`).join('\n') || '_(none — every Interlace TP also caught by ≥1 competitor)_';
  const onlyArena = s.arena.onlyInterlace.map((x) => `- ${x}`).join('\n') || '_(none)_';

  return `# ILB Coverage & Inter-Rater Report

> Generated: ${today} · Methodology: [\`benchmarks/ILB_NAMING.md\`](./ILB_NAMING.md)
>
> Closes the OWASP-Benchmark-style trust gap by reporting three orthogonal validation signals that do not depend on labels alone.

## 1. Inter-rater agreement (the OWASP-style trust signal)

For each fixture, we count how many tools' verdicts match the fixture's label.

### ILB-Juliet (synthetic CWE corpus)

- Tools rated: **${s.juliet.tools.length}** — \`${s.juliet.tools.join('\`, \`')}\`
- Fixtures rated: **${s.juliet.totalFixtures}**
- Fixtures where **≥ 3 tools agree** with the label: **${s.juliet.fixtures3PlusAgree} (${s.juliet.pctFixtures3PlusAgree}%)**
- Fixtures where **all tools agree** with the label: **${s.juliet.fixturesAllAgree} (${s.juliet.pctFixturesAllAgree}%)**

#### Cohen's κ — Interlace vs each competitor (Juliet)

\`\`\`
< 0.2  slight    · 0.2–0.4 fair · 0.4–0.6 moderate ·
0.6–0.8 substantial · 0.8–1.0 almost perfect · 1 perfect
\`\`\`

| Competitor | κ | Interpretation |
|---|---|---|
${julietKappaRows}

### ILB-Arena (function-level fixtures)

- Tools rated: **${s.arena.tools.length}**
- Fixtures rated: **${s.arena.totalFixtures}**
- Fixtures where **≥ 3 tools agree**: **${s.arena.fixtures3PlusAgree} (${s.arena.pctFixtures3PlusAgree}%)**
- Fixtures where **all tools agree**: **${s.arena.fixturesAllAgree} (${s.arena.pctFixturesAllAgree}%)**

#### Cohen's κ — Interlace vs each competitor (Arena)

| Competitor | κ | Interpretation |
|---|---|---|
${arenaKappaRows}

## 2. Over-fit detector — fixtures only Interlace catches

If Interlace is the **only** tool to catch a vulnerable fixture, that's
either a real coverage advantage (good) or a fixture written to match our
rule (bad). These deserve human triage.

### ILB-Juliet — vulnerable fixtures only Interlace caught

${onlyJuliet}

### ILB-Arena — vulnerable fixtures only Interlace caught

${onlyArena.length < 4000 ? onlyArena : onlyArena.slice(0, 3500) + '\n...(truncated)'}

## 3. Coverage breadth — corpus depth per CWE

A CWE with fewer than 2 vulnerable + 2 safe fixtures is too thin for
its F1 to be meaningful (CI is too wide).

| CWE | Vulnerable | Safe | Status |
|---|---|---|---|
${breadthRows}

${s.coverageBreadth.gaps.length === 0 ? '✅ Every CWE meets the ≥2 fixture threshold.' : `⚠️ ${s.coverageBreadth.gaps.length} CWE(s) below threshold.`}

## How to read this

- **High Cohen's κ with sonarjs / microsoft-sdl** = our verdicts agree with the most credible commercial tools.
- **High % of "≥3 tools agree" fixtures** = the corpus has clear ground truth, not edge cases that even tools disagree on.
- **Empty over-fit list** = our TPs are consistently caught by other plugins too — we're not testing fictional patterns.
- **No coverage gaps** = every CWE has enough fixtures to draw conclusions from.

If any of these degrade over time, regenerate this report and triage the new entries.
`;
}
