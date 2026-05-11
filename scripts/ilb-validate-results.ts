#!/usr/bin/env -S npx tsx
/**
 * ilb-validate-results — vocabulary contract enforcement (roadmap item 1.11).
 *
 * Walks `benchmarks/results/`, validates every JSON envelope against the
 * standard field names defined in `benchmarks/lib/result-schema.json`, and
 * exits non-zero if any file uses banned synonyms or skips required fields.
 *
 * Wire-up:
 *   - Run locally:    `npm run ilb:validate-results` (from benchmarks/)
 *   - CI gate:        added to per-PR pipeline alongside `ilb:validate-fixtures`
 *
 * Banned-synonym examples (will fail):
 *     "tokens": 1234            → use cost.tokensO200k
 *     "accuracy": 0.93          → use effectiveness.f1 / precision / recall
 *     "time": 1.4               → use latency.meanLatencyMs / msPerFile
 *     "ms_per_file": 9.9        → use latency.msPerFile (camelCase)
 *
 * Hand-written validator (no ajv dep) — small enough that the rules stay
 * inline-readable and we don't fight workspace dependency resolution.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// The `toolchain` helper was migrated from .mjs to .ts during the
// turborepo migration; the import path is canonical .ts now.
import { validateToolchain } from '../benchmarks/lib/toolchain.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const RESULTS_ROOT = path.join(REPO_ROOT, 'benchmarks', 'results');
const SCHEMA_PATH = path.join(REPO_ROOT, 'benchmarks', 'lib', 'result-schema.json');

const SCHEMA = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const BLOCKED_AT_ROOT = new Set(SCHEMA.definitions.synonymsBlocked.blockedAtRoot);
const ALLOWED_BENCHES = new Set(SCHEMA.properties.bench.enum);

const ALLOWED_COST_KEYS = new Set(Object.keys(SCHEMA.properties.cost.properties));
const ALLOWED_EFFECTIVENESS_KEYS = new Set(Object.keys(SCHEMA.properties.effectiveness.properties));
const ALLOWED_LATENCY_KEYS = new Set(Object.keys(SCHEMA.properties.latency.properties));

const STRICT = process.argv.includes('--strict');
const QUIET = process.argv.includes('--quiet');

function findJsonFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findJsonFiles(p));
    else if (entry.name.endsWith('.json')) out.push(p);
  }
  return out;
}

function checkBlockedSynonyms(obj, issues, locationLabel) {
  // The blocked-synonym list (`tokens`, `cost`, `accuracy`, …) is intended
  // to forbid *primitive-valued* drift — e.g. `"cost": 1234` instead of
  // the structured `cost: { tokensO200k: 1234 }`. Some of those names are
  // ALSO the names of legitimate top-level structured blocks per the
  // schema (cost / effectiveness / latency exist as `properties` and as
  // synonyms). When the value is an object, defer to `checkSubsetKeys`
  // which validates the inner keys against the allow-list — flagging it
  // here too would forbid the contract's own shape.
  for (const key of Object.keys(obj)) {
    if (!BLOCKED_AT_ROOT.has(key)) continue;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      // Legitimate structured block — `checkSubsetKeys` enforces inner shape.
      continue;
    }
    issues.push(`${locationLabel}: blocked synonym "${key}" at root — see schema definitions.synonymsBlocked.blockedAtRoot for the standard field`);
  }
}

function checkSubsetKeys(obj, allowed, issues, label) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      issues.push(`${label}: unknown field "${key}" — only ${[...allowed].join(', ')} are part of the vocabulary contract`);
    }
  }
}

function validateResultFile(filePath) {
  const issues = [];
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return [`${filePath}: not valid JSON (${err.message})`];
  }

  const rel = path.relative(REPO_ROOT, filePath);

  // Required fields — relaxed on the historical corpus, strict on new files.
  // STRICT mode treats missing required fields as fatal.
  for (const required of ['bench', 'benchVersion', 'timestamp', 'toolchain']) {
    if (parsed[required] === undefined) {
      const msg = `${rel}: missing required field "${required}"`;
      if (STRICT) issues.push(msg);
      else issues.push(`${msg} (warning — pre-vocabulary-contract file)`);
    }
  }

  if (parsed.bench && !ALLOWED_BENCHES.has(parsed.bench)) {
    issues.push(`${rel}: bench "${parsed.bench}" not in the allow-list — see schema.properties.bench.enum`);
  }

  if (parsed.toolchain) {
    const toolchainIssues = validateToolchain(parsed.toolchain);
    for (const t of toolchainIssues) issues.push(`${rel}: ${t}`);
  }

  checkBlockedSynonyms(parsed, issues, rel);
  checkSubsetKeys(parsed.cost, ALLOWED_COST_KEYS, issues, `${rel}.cost`);
  checkSubsetKeys(parsed.effectiveness, ALLOWED_EFFECTIVENESS_KEYS, issues, `${rel}.effectiveness`);
  checkSubsetKeys(parsed.latency, ALLOWED_LATENCY_KEYS, issues, `${rel}.latency`);
  checkProvenance(parsed.provenance, issues, rel);

  return issues;
}

/**
 * Provenance contract — see benchmarks/README.md "The provenance contract".
 * If a result publishes a `provenance` block, it must answer the two
 * reproducibility questions: which model produced or scored the output,
 * and which tools were involved at which versions in what role.
 *
 * `provenance` is OPTIONAL (warning-only when absent), but when present
 * its shape is enforced — drift here makes the result non-reproducible
 * even when the cost/effectiveness/latency numbers look clean.
 */
function checkProvenance(prov, issues, locationLabel) {
  if (prov === undefined || prov === null) return; // optional
  if (typeof prov !== 'object' || Array.isArray(prov)) {
    issues.push(`${locationLabel}: provenance must be an object`);
    return;
  }
  // model.kind ∈ {llm, tokenizer-proxy, none}
  if (prov.model === undefined) {
    issues.push(`${locationLabel}: provenance.model is required when provenance is present`);
  } else {
    const kind = prov.model && prov.model.kind;
    const ALLOWED_KINDS = ['llm', 'tokenizer-proxy', 'none'];
    if (!ALLOWED_KINDS.includes(kind)) {
      issues.push(`${locationLabel}: provenance.model.kind must be one of ${ALLOWED_KINDS.join(', ')} (got ${JSON.stringify(kind)})`);
    }
    if (typeof prov.model.name !== 'string' || prov.model.name.length === 0) {
      issues.push(`${locationLabel}: provenance.model.name must be a non-empty string`);
    }
  }
  // tools.count must equal tools.items.length
  if (prov.tools === undefined) {
    issues.push(`${locationLabel}: provenance.tools is required when provenance is present`);
  } else {
    const items = prov.tools.items;
    if (!Array.isArray(items)) {
      issues.push(`${locationLabel}: provenance.tools.items must be an array`);
    } else {
      if (typeof prov.tools.count !== 'number') {
        issues.push(`${locationLabel}: provenance.tools.count must be a number`);
      } else if (prov.tools.count !== items.length) {
        issues.push(`${locationLabel}: provenance.tools.count (${prov.tools.count}) does not match tools.items.length (${items.length}) — drift indicates a stale result`);
      }
      for (let i = 0; i < items.length; i++) {
        const t = items[i];
        if (!t || typeof t !== 'object') {
          issues.push(`${locationLabel}: provenance.tools.items[${i}] must be an object`);
          continue;
        }
        for (const k of ['name', 'version', 'role']) {
          if (typeof t[k] !== 'string' || t[k].length === 0) {
            issues.push(`${locationLabel}: provenance.tools.items[${i}].${k} must be a non-empty string`);
          }
        }
      }
    }
  }
}

function main() {
  const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = targets.length
    ? targets.flatMap((t) => (fs.statSync(t).isDirectory() ? findJsonFiles(t) : [t]))
    : findJsonFiles(RESULTS_ROOT);

  if (files.length === 0) {
    if (!QUIET) console.log('ilb-validate-results: no result files found.');
    process.exit(0);
  }

  let totalIssues = 0;
  let fatalIssues = 0;
  const failingFiles = [];

  for (const file of files) {
    const issues = validateResultFile(file);
    if (issues.length === 0) continue;

    failingFiles.push({ file, issues });
    totalIssues += issues.length;
    fatalIssues += issues.filter((i) => !i.includes('(warning')).length;
  }

  if (failingFiles.length === 0) {
    if (!QUIET) console.log(`ilb-validate-results: ✅ ${files.length} files pass the vocabulary contract`);
    process.exit(0);
  }

  for (const { file, issues } of failingFiles) {
    console.log(`\n${path.relative(REPO_ROOT, file)}`);
    for (const issue of issues) console.log(`  • ${issue}`);
  }

  console.log(`\nilb-validate-results: ${failingFiles.length}/${files.length} files have issues (${totalIssues} total, ${fatalIssues} fatal)`);

  // Strict mode fails on any issue. Default mode fails only on fatal.
  process.exit(STRICT ? (totalIssues > 0 ? 1 : 0) : (fatalIssues > 0 ? 1 : 0));
}

main();
