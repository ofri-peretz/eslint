#!/usr/bin/env -S npx tsx

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
 * JSON at benchmark-results/coverage.json — consumed by `ilb:scorecard`
 * which renders the Trust Signals section directly into scorecard.md.
 *
 * Usage:
 *   tsx scripts/ilb-fixture-coverage.ts            # write coverage.json
 *   tsx scripts/ilb-fixture-coverage.ts --print    # also print to stdout
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BENCH_RESULTS = path.join(ROOT, 'benchmarks', 'results');
const CORPUS_DIR = path.join(ROOT, 'benchmarks', 'corpus');
const OUT_PATH = path.join(ROOT, 'benchmark-results', 'coverage.json');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const PRINT = flag('print');

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
  const cweRows: any[] = [];
  for (const [cwe, info] of Object.entries(juliet.plugins?.interlace?.perCwe ?? {}) as Array<[string, any]>) {
    for (const f of info.fixtures) {
      cweRows.push({ cwe, file: f.file, expectedVulnerable: f.expectedVulnerable, perTool: {} });
    }
  }
  // For each plugin, fill in detected={true|false} on each fixture
  for (const [pluginName, pluginData] of Object.entries(juliet.plugins ?? {}) as Array<[string, any]>) {
    if (!pluginData.perCwe) continue;
    for (const [cwe, info] of Object.entries(pluginData.perCwe) as Array<[string, any]>) {
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
  const allFixtures = new Set<string>();
  for (const p of Object.values(arena.plugins ?? {}) as any[]) {
    for (const f of p.metrics?.detectedVulnerabilities ?? []) allFixtures.add(['vuln', f].join('::'));
    for (const f of p.metrics?.missedVulnerabilities ?? []) allFixtures.add(['vuln', f].join('::'));
    for (const f of p.metrics?.falsePositives ?? []) allFixtures.add(['safe', f].join('::'));
  }
  const tools = Object.keys(arena.plugins ?? {});

  const rows: any[] = [];
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

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(summary, null, 2));
console.log(`✅ ${path.relative(ROOT, OUT_PATH)}`);
if (PRINT) console.log('\n' + JSON.stringify(summary, null, 2));
