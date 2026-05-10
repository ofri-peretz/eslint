#!/usr/bin/env -S npx tsx
/**
 * verify-oxlint-runtime.ts — auto-certify oxlint runtime against our API contract.
 *
 * Replaces the manual "go read apps/oxlint/src-js/plugins/ at the new tag" step
 * required when bumping oxlint. Loads scripts/probe-oxlint-runtime.cjs as a JS
 * plugin in the actually-installed oxlint, runs it on a fixture, and asserts
 * that every probe (one per API surface our rules depend on) emits a
 * PROBE_OK diagnostic.
 *
 * If every probe fires:
 *   • The runtime supports our entire API surface — verified, not assumed.
 *   • With --update, the script regenerates VERIFIED_OXLINT_RUNTIME_HASHES
 *     in scripts/audit-rule-portability.ts to match the installed bundles,
 *     so the hash gate will pass on the bumped version.
 *
 * If any probe is missing:
 *   • Exit non-zero and name the missing API surfaces specifically.
 *   • Hashes are NOT bumped — re-running `audit:portability:ci` will still
 *     fail until either (a) oxlint is downgraded or (b) the broken probe is
 *     investigated and either patched (we now know which API regressed) or
 *     declared an acceptable loss with corresponding rule refactors.
 *
 * Usage:
 *   tsx scripts/verify-oxlint-runtime.ts            # check, exit non-zero on miss
 *   tsx scripts/verify-oxlint-runtime.ts --update   # check + auto-bump hashes
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROBE_PATH = path.join(__dirname, 'probe-oxlint-runtime.cjs');
const AUDIT_PATH = path.join(__dirname, 'audit-rule-portability.ts');

const args = new Set(process.argv.slice(2));
const UPDATE = args.has('--update');

// 1. Load the probe to get its expected probe-name list.
const probe = require(PROBE_PATH);
const ALL_PROBES: string[] = probe.ALL_PROBES;

// 2. Build a temp oxlint config that registers the probe and enables every rule.
const tmpDir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'oxlint-probe-'));
const fixturePath = path.join(tmpDir, 'fixture.js');
const configPath = path.join(tmpDir, '.oxlintrc.json');

// A fixture that triggers every visitor we use in the probes:
//   - Program (every rule)
//   - VariableDeclaration (scope + tokens probes)
fs.writeFileSync(fixturePath, [
  '// runtime probe fixture',
  'const probeBinding = 1;',
  'const second = 2;',
].join('\n') + '\n');

const probeRuleNames = Object.keys(probe.rules);
fs.writeFileSync(configPath, JSON.stringify({
  plugins: [],
  categories: {
    correctness: 'off', suspicious: 'off', perf: 'off',
    pedantic: 'off', style: 'off', restriction: 'off', nursery: 'off',
  },
  jsPlugins: [{ name: 'probe', specifier: PROBE_PATH }],
  rules: Object.fromEntries(probeRuleNames.map(n => [`probe/${n}`, 'error'])),
}, null, 2) + '\n');

// 3. Run oxlint and parse output.
console.log('');
console.log('═'.repeat(70));
console.log('  OXLINT RUNTIME PROBE');
console.log('═'.repeat(70));
console.log('');

const installedVersion = (() => {
  const lock = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lock)) return '?';
  try {
    const j = JSON.parse(fs.readFileSync(lock, 'utf-8'));
    return j.packages?.['node_modules/oxlint']?.version ?? '?';
  } catch { return '?'; }
})();
console.log(`  installed oxlint: ${installedVersion}`);
console.log(`  probes:           ${ALL_PROBES.length}`);
console.log('');

let raw = '';
try {
  raw = execSync(
    `npx oxlint --config "${configPath}" --format json "${fixturePath}"`,
    { cwd: ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 },
  );
} catch (err: any) {
  raw = err.stdout?.toString() ?? '';
  if (!raw) {
    console.error('✗ oxlint failed to run probe plugin:');
    console.error(err.stderr?.toString() ?? err.message);
    process.exit(2);
  }
}

let parsed: any;
try { parsed = JSON.parse(raw); } catch {
  console.error('✗ oxlint returned non-JSON output:');
  console.error(raw.slice(0, 500));
  process.exit(2);
}

const diagnostics: any[] = parsed.diagnostics ?? [];
const observed = new Set<string>();
for (const d of diagnostics) {
  const m = (d.message ?? '').match(/^PROBE_OK (.+)$/);
  if (m) observed.add(m[1].trim());
}

// 4. Diff observed vs expected.
const missing = ALL_PROBES.filter(p => !observed.has(p));
const extra = [...observed].filter(p => !ALL_PROBES.includes(p));

for (const p of ALL_PROBES) {
  console.log(`  ${observed.has(p) ? '✓' : '✗'}  ${p}`);
}
console.log('');

// Cleanup temp config + fixture.
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

if (missing.length > 0) {
  console.log(`  ✗ ${missing.length}/${ALL_PROBES.length} probe(s) missing on oxlint ${installedVersion}.`);
  console.log('');
  console.log('  These API surfaces are no longer supported. Either:');
  console.log('    (a) downgrade oxlint to a verified version, or');
  console.log('    (b) refactor the rules that depend on these surfaces, or');
  console.log('    (c) update the probe + audit blocker list to reflect the new contract.');
  console.log('');
  process.exit(1);
}

console.log(`  ✅ all ${ALL_PROBES.length} probes passed on oxlint ${installedVersion}.`);

if (extra.length > 0) {
  console.log(`  ℹ ${extra.length} unrecognized probe message(s) — harmless: ${extra.join(', ')}`);
}
console.log('');

// 5. With --update, auto-bump the runtime hashes.
if (UPDATE) {
  const oxlintDist = path.join(ROOT, 'node_modules', 'oxlint', 'dist');
  const hashes: Record<string, string> = {};
  for (const f of ['plugins.js', 'plugins-dev.js', 'lint.js', 'bindings.js']) {
    const full = path.join(oxlintDist, f);
    if (!fs.existsSync(full)) {
      console.error(`✗ expected runtime file missing: ${f}`);
      process.exit(2);
    }
    hashes[f] = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  }

  let auditSrc = fs.readFileSync(AUDIT_PATH, 'utf-8');
  const newBlock = [
    'const VERIFIED_OXLINT_RUNTIME_HASHES = {',
    ...Object.entries(hashes).map(([f, h]) => `  '${f}':${' '.repeat(Math.max(1, 14 - f.length - 4))}'${h}',`),
    '};',
  ].join('\n');
  const blockRe = /const VERIFIED_OXLINT_RUNTIME_HASHES = \{[\s\S]*?\n\};/;
  if (!blockRe.test(auditSrc)) {
    console.error('✗ could not locate VERIFIED_OXLINT_RUNTIME_HASHES block in audit script.');
    process.exit(2);
  }
  auditSrc = auditSrc.replace(blockRe, newBlock);

  // Also bump the version-string range to match the installed major.minor.
  const major = installedVersion.split('.').slice(0, 2).join('.');
  if (major && major !== '?') {
    auditSrc = auditSrc.replace(
      /const VERIFIED_OXLINT_RANGE = \{ min: '[\d.]+', maxKnown: '[\d.x]+' \};/,
      `const VERIFIED_OXLINT_RANGE = { min: '${installedVersion}', maxKnown: '${major}.x' };`,
    );
  }

  fs.writeFileSync(AUDIT_PATH, auditSrc);
  console.log(`  ↻ updated VERIFIED_OXLINT_RUNTIME_HASHES + VERIFIED_OXLINT_RANGE in:`);
  console.log(`     ${path.relative(ROOT, AUDIT_PATH)}`);
  console.log('');
  console.log('  Next steps:');
  console.log('    git diff scripts/audit-rule-portability.ts   # review the bump');
  console.log('    npm run audit:portability:ci                  # re-run gate (should pass)');
  console.log('');
}
