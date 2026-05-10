#!/usr/bin/env -S npx tsx
/**
 * ilb-mappings-report — compliance crosswalk per plugin (roadmap item 2.1).
 *
 * For every Interlace rule, derive its mapping to the three external
 * compliance frameworks and emit a per-plugin crosswalk document:
 *
 *   - **NIST SP 800-218 (SSDF)** — the framework cited by US Executive Order
 *     14028 for federal procurement. Maps each rule to one or more SSDF
 *     practices (PW.4, PW.6, RV.1, etc.).
 *
 *   - **OWASP ASVS** — the standard every enterprise security review checks.
 *     Maps each rule to one or more ASVS controls + level (L1/L2/L3).
 *
 *   - **MITRE ATT&CK / CAPEC** — the adversary-technique view. Tells defenders
 *     what attack patterns the rule blocks.
 *
 * Resolution order for a rule's mapping:
 *   1. Rule's own meta annotations: `meta.ssdf`, `meta.asvs`, `meta.capec`.
 *   2. Seeded examples in benchmarks/lib/mappings/{asvs,capec}.json.
 *   3. Default fallback per the framework's own default mapping (SSDF → PW.4 + PW.6 for any security rule; CAPEC → derived from CWE via capec.json deriveFromCwe).
 *
 * Output: `benchmark-results/compliance-crosswalk.{json,md}` — the artifact
 * that goes into the MITRE submission packet, OWASP-ASVS docs link, and any
 * federal-procurement RFP response.
 *
 * Usage:
 *   npm run ilb:mappings:report
 *   node scripts/ilb-mappings-report.mjs --plugin secure-coding
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const PACKAGES_ROOT = path.join(REPO_ROOT, 'packages');
const MAPPINGS_DIR = path.join(REPO_ROOT, 'benchmarks', 'lib', 'mappings');
const OUT_DIR = path.join(REPO_ROOT, 'benchmark-results');

const ARG = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const ONLY_PLUGIN = ARG('--plugin');

const SSDF = JSON.parse(fs.readFileSync(path.join(MAPPINGS_DIR, 'ssdf.json'), 'utf8'));
const ASVS = JSON.parse(fs.readFileSync(path.join(MAPPINGS_DIR, 'asvs.json'), 'utf8'));
const CAPEC = JSON.parse(fs.readFileSync(path.join(MAPPINGS_DIR, 'capec.json'), 'utf8'));

function discoverPlugins() {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs.readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .filter((e) => !ONLY_PLUGIN || e.name.replace(/^eslint-plugin-/, '') === ONLY_PLUGIN)
    .map((e) => ({ pluginName: e.name.replace(/^eslint-plugin-/, ''), dir: path.join(PACKAGES_ROOT, e.name) }));
}

function extractRuleMeta(ruleSource) {
  const out = { cwes: [], ssdf: [], asvs: [], capec: [] };

  for (const m of ruleSource.matchAll(/\bcwe\s*[:=]\s*['"`](CWE-\d+)['"`]/g)) out.cwes.push(m[1]);
  for (const m of ruleSource.matchAll(/\bcwe\s*[:=]\s*\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/['"`](CWE-\d+)['"`]/g)) out.cwes.push(id[1]);
  }
  for (const m of ruleSource.matchAll(/\bssdf\s*[:=]\s*\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/['"`]([A-Z]{2}\.\d+)['"`]/g)) out.ssdf.push(id[1]);
  }
  for (const m of ruleSource.matchAll(/\bcapec\s*[:=]\s*\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/['"`](CAPEC-[\w-]+)['"`]/g)) out.capec.push(id[1]);
  }
  // ASVS often emitted as objects; we accept arrays of strings or pre-built array entries
  for (const m of ruleSource.matchAll(/\basvs\s*[:=]\s*\[([^\]]+)\]/g)) {
    for (const id of m[1].matchAll(/['"`](V\d+(?:\.\d+){1,2})['"`]/g)) out.asvs.push(id[1]);
  }
  return out;
}

function listRulesForPlugin(plugin) {
  const rulesDir = path.join(plugin.dir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidates = ['index.ts', 'index.js'];
    for (const f of candidates) {
      const p = path.join(rulesDir, entry.name, f);
      if (!fs.existsSync(p)) continue;
      const meta = extractRuleMeta(fs.readFileSync(p, 'utf8'));
      out.push({ ruleId: `${plugin.pluginName}/${entry.name}`, plugin: plugin.pluginName, ...meta });
      break;
    }
  }
  return out;
}

function deriveSsdf(rule) {
  if (rule.ssdf.length > 0) return rule.ssdf;
  return SSDF.defaultRulePracticeMapping.all;
}

function deriveAsvs(rule) {
  if (rule.asvs.length > 0) return rule.asvs;
  const seed = ASVS.exampleRuleMappings[rule.ruleId];
  if (seed) return seed.map((s) => s.control ?? s);
  return [];
}

function deriveCapec(rule) {
  if (rule.capec.length > 0) return rule.capec;
  const out = new Set();
  for (const cwe of rule.cwes) {
    const derived = CAPEC.deriveFromCwe[cwe];
    if (derived) for (const c of derived) out.add(c);
  }
  return [...out];
}

function buildReport(rules) {
  return rules.map((r) => ({
    ...r,
    derivedSsdf: deriveSsdf(r),
    derivedAsvs: deriveAsvs(r),
    derivedCapec: deriveCapec(r),
  }));
}

function renderMd(report) {
  const byPlugin = new Map();
  for (const r of report) {
    if (!byPlugin.has(r.plugin)) byPlugin.set(r.plugin, []);
    byPlugin.get(r.plugin).push(r);
  }

  const lines = [];
  lines.push('# Compliance Crosswalk — NIST SSDF · OWASP ASVS · MITRE CAPEC');
  lines.push('');
  lines.push(`> Generated by \`npm run ilb:mappings:report\` on ${new Date().toISOString()}.`);
  lines.push('> Per-rule mappings to the three frameworks our enterprise / federal customers ask about. Source maps in [`benchmarks/lib/mappings/`](../benchmarks/lib/mappings/).');
  lines.push('');

  // SSDF coverage summary
  const ssdfCounts = countMappings(report, 'derivedSsdf');
  lines.push('## NIST SP 800-218 (SSDF) — practice coverage');
  lines.push('');
  lines.push('| Practice | Rules covering |');
  lines.push('|---|---:|');
  for (const [practice, n] of [...ssdfCounts.entries()].sort((a, b) => b[1] - a[1])) {
    const desc = SSDF.practices[practice]?.name ?? '';
    lines.push(`| **${practice}** ${desc} | ${n} |`);
  }
  lines.push('');

  // ASVS section coverage
  const asvsCounts = countMappings(report, 'derivedAsvs', (c) => c.split('.')[0]);
  lines.push('## OWASP ASVS — section coverage');
  lines.push('');
  lines.push('| Section | Name | Rules covering |');
  lines.push('|---|---|---:|');
  for (const [section, n] of [...asvsCounts.entries()].sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1)))) {
    const name = ASVS.sections[section]?.name ?? '';
    lines.push(`| **${section}** | ${name} | ${n} |`);
  }
  lines.push('');

  // Per-plugin breakdown
  lines.push('## Per-plugin mappings');
  lines.push('');
  for (const [plugin, pluginRules] of [...byPlugin.entries()].sort()) {
    lines.push(`### ${plugin}`);
    lines.push('');
    lines.push('| Rule | CWE | SSDF | ASVS | CAPEC |');
    lines.push('|---|---|---|---|---|');
    for (const r of pluginRules.sort((a, b) => a.ruleId.localeCompare(b.ruleId))) {
      lines.push(`| \`${r.ruleId.split('/').slice(1).join('/')}\` | ${r.cwes.join(', ') || '—'} | ${r.derivedSsdf.join(', ') || '—'} | ${r.derivedAsvs.join(', ') || '—'} | ${r.derivedCapec.join(', ') || '—'} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function countMappings(report, field, transform = (c) => c) {
  const counts = new Map();
  for (const r of report) {
    for (const c of r[field]) {
      const key = transform(c);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

function main() {
  const plugins = discoverPlugins();
  const rules = plugins.flatMap(listRulesForPlugin);
  const report = buildReport(rules);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const json = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRules: report.length,
      ssdfPracticesHit: countMappings(report, 'derivedSsdf').size,
      asvsSectionsHit: countMappings(report, 'derivedAsvs', (c) => c.split('.')[0]).size,
      capecPatternsHit: countMappings(report, 'derivedCapec').size,
    },
    rules: report,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'compliance-crosswalk.json'), JSON.stringify(json, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'compliance-crosswalk.md'), renderMd(report) + '\n', 'utf8');

  console.log(`ilb-mappings-report: ${report.length} rules · SSDF practices ${json.summary.ssdfPracticesHit} · ASVS sections ${json.summary.asvsSectionsHit} · CAPEC patterns ${json.summary.capecPatternsHit}`);
  console.log(`  wrote benchmark-results/compliance-crosswalk.{json,md}`);
}

main();
