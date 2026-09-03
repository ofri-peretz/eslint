#!/usr/bin/env -S npx tsx
/**
 * verify-published-artifact.ts — pre-publish gate for our ESLint plugins.
 *
 * Treats the npm-packable artifact (not the source tree) as the unit of
 * truth: packs the plugin + its workspace `@interlace/eslint-devkit`
 * dependency into tarballs, installs them into a clean temp project, and
 * smoke-runs the resulting package under BOTH ESLint and oxlint.
 *
 * Catches the class of bug source-only checks miss:
 *   • `files: [...]` in package.json forgets to include a built rule
 *   • `dist/` is stale relative to `src/`
 *   • `@interlace/eslint-devkit` peer/dep version range doesn't actually
 *     resolve against the latest published devkit
 *   • oxlint shim at tools/oxlint-plugins/ points at a path that doesn't
 *     exist in the packed tree
 *   • A rule's `meta.messages` is missing a referenced messageId
 *
 * Fixture-driven: each plugin owns a canonical fixture +
 * baseline.json under `packages/<plugin>/test/artifact-smoke/`. Running
 * ESLint against the fixture must produce findings identical to the
 * baseline (same rule IDs at the same line). Same for oxlint, against
 * the rules-subset that has a portable shim.
 *
 * Usage:
 *   tsx scripts/verify-published-artifact.ts --package eslint-plugin-secure-coding
 *   tsx scripts/verify-published-artifact.ts --package eslint-plugin-secure-coding --update-baseline
 *   tsx scripts/verify-published-artifact.ts --all       # every plugin with a fixture
 *
 * Exits 0 on a clean run; 1 on any mismatch (with a diff printed); 2 on a
 * setup error (missing fixture, install failure, oxlint absent).
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import process from 'node:process';

const ROOT = resolve(import.meta.dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');
const SHIMS_DIR = join(ROOT, 'tools', 'oxlint-plugins');
const DEVKIT_NAME = '@interlace/eslint-devkit';
const DEVKIT_DIR = join(PACKAGES_DIR, 'eslint-devkit');

type Finding = { ruleId: string; line: number; messageId?: string };

/**
 * `parity.knownDivergences` documents (rule, line) pairs where ESLint and
 * oxlint legitimately disagree — typically because a portable rule's
 * oxlint codepath has a known bug or a behaviour difference the team has
 * explicitly accepted. Anything *outside* this allow-list is a publish
 * blocker: it means the artifact regressed cross-engine parity since
 * the last time the baseline was refreshed.
 *
 * Format: `"<ruleId>@<line>": "<reason>"`. Add an entry when accepting
 * the divergence; remove it when the underlying engine bug is fixed.
 */
type Baseline = {
  schema: 'artifact-smoke/v2';
  pluginName: string;
  configKey: string;
  eslint: { findings: Finding[] };
  oxlint: { findings: Finding[]; ruleSubset: string[] };
  parity: { knownDivergences: Record<string, string> };
};

const args = parseArgs(process.argv.slice(2));
const UPDATE = !!args['update-baseline'];

if (args.all) {
  const pkgs = readdirSync(PACKAGES_DIR)
    .filter((d) => d.startsWith('eslint-plugin-'))
    .filter((d) => existsSync(join(PACKAGES_DIR, d, 'test/artifact-smoke/fixture.js')));
  if (!pkgs.length) {
    console.error('verify-published-artifact: no packages with a test/artifact-smoke/ fixture were found.');
    process.exit(2);
  }
  let failures = 0;
  for (const pkg of pkgs) {
    console.log(`\n── ${pkg} ───────────────────────────────────────────────────`);
    try {
      verifyOne(pkg);
    } catch (err) {
      failures += 1;
      console.error(`  ✗ ${pkg}: ${(err as Error).message}`);
    }
  }
  process.exit(failures === 0 ? 0 : 1);
}

if (!args.package) {
  console.error('usage: verify-published-artifact --package <name> [--update-baseline]');
  console.error('       verify-published-artifact --all');
  process.exit(2);
}

verifyOne(args.package);

// ─────────────────────────────────────────────────────────────────────────────

function verifyOne(pkgName: string): void {
  const pkgDir = join(PACKAGES_DIR, pkgName);
  if (!existsSync(pkgDir)) {
    throw new Error(`package directory not found: ${pkgDir}`);
  }
  const fixtureDir = join(pkgDir, 'test', 'artifact-smoke');
  const fixturePath = join(fixtureDir, 'fixture.js');
  const baselinePath = join(fixtureDir, 'baseline.json');
  if (!existsSync(fixturePath)) {
    throw new Error(`fixture missing: ${fixturePath} (create it before running this verifier)`);
  }
  if (!existsSync(baselinePath) && !UPDATE) {
    throw new Error(`baseline missing: ${baselinePath} (run with --update-baseline to create one)`);
  }

  // 1. Build the package + devkit (idempotent under turbo).
  log(`building ${pkgName} + ${DEVKIT_NAME} (turbo)`);
  run('npx', ['turbo', 'run', 'build', `--filter=${pkgName}`, '--filter=@interlace/eslint-devkit'], ROOT);

  // 2. Pack both into a workdir.
  const workdir = mkdtempSync(join(tmpdir(), `artifact-verify-${pkgName}-`));
  log(`workdir: ${workdir}`);
  const tarballs = {
    devkit: packPackage(DEVKIT_DIR, workdir),
    plugin: packPackage(pkgDir, workdir),
  };

  // 3. Set up an isolated install. npm resolves the plugin's
  //    @interlace/eslint-devkit dep against whichever copy is already
  //    installed when semver allows — so installing devkit's tarball first
  //    pins the plugin to it without needing `overrides`.
  const projectDir = join(workdir, 'consumer');
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify({ name: 'artifact-smoke-consumer', version: '0.0.0', private: true }, null, 2) + '\n',
  );
  log('installing eslint + oxlint + tarballs into clean project');
  // `typescript` is declared as an OPTIONAL peer dep on
  // `@interlace/eslint-devkit`, but the published artifact does an
  // unguarded `require('typescript')` in dist/src/types/type-utils.js —
  // so installing devkit without TS throws MODULE_NOT_FOUND on import.
  // We install it explicitly here to match the transitive resolution
  // real consumers get via @typescript-eslint/parser → typescript.
  // TODO: lazy-require typescript inside the devkit and remove this.
  run('npm', ['install', '--no-audit', '--no-fund', '--silent',
    'eslint@9',
    '@typescript-eslint/parser@latest',
    'typescript@5',
    'oxlint@latest',
    tarballs.devkit,
    tarballs.plugin,
  ], projectDir);

  // 4. Structural smoke: can we require the package, are rules present, do all messageIds resolve?
  log('structural smoke: require()/rules/meta.messages integrity');
  const structural = spawnSync(
    'node',
    ['-e', structuralSmokeProgram(pkgName)],
    { cwd: projectDir, encoding: 'utf-8' },
  );
  if (structural.status !== 0) {
    console.error(structural.stdout);
    console.error(structural.stderr);
    throw new Error(`structural smoke failed for ${pkgName}`);
  }
  const structuralResult = JSON.parse(structural.stdout.trim());
  log(`  ✓ rules: ${structuralResult.ruleCount}, configs: ${structuralResult.configs.join(', ')}`);

  // 5. ESLint run against the fixture.
  const fixtureTarget = join(projectDir, 'fixture.js');
  cpSync(fixturePath, fixtureTarget);
  // Copy fixture into the install root so resolution mirrors a real consumer.
  writeFileSync(
    join(projectDir, 'eslint.config.mjs'),
    eslintFlatConfig(pkgName, structuralResult.configKey),
  );
  log('running ESLint against fixture');
  const eslintFindings = runEslint(projectDir);

  // 6. oxlint run (only against the rule subset that has a shim).
  log('running oxlint against fixture');
  const { findings: oxlintFindings, ruleSubset } = runOxlint(projectDir, pkgName, fixtureTarget);

  // 7. Cross-engine parity: for any rule that has an oxlint shim, the
  //    (ruleId, line) findings must match between ESLint and oxlint. An
  //    explicit `parity.knownDivergences` allow-list in the baseline
  //    documents accepted gaps; anything outside it fails the gate.
  const existingBaseline: Baseline | null = existsSync(baselinePath)
    ? (JSON.parse(readFileSync(baselinePath, 'utf-8')) as Baseline)
    : null;
  const knownDivergences = existingBaseline?.parity?.knownDivergences ?? {};
  const parityViolations = computeParityViolations(
    eslintFindings,
    oxlintFindings,
    ruleSubset,
    knownDivergences,
  );

  const observed: Pick<Baseline, 'eslint' | 'oxlint'> = {
    eslint: { findings: eslintFindings },
    oxlint: { findings: oxlintFindings, ruleSubset },
  };

  if (UPDATE) {
    const next: Baseline = {
      schema: 'artifact-smoke/v2',
      pluginName: pkgName,
      configKey: structuralResult.configKey,
      ...observed,
      // Preserve any prior knownDivergences so refreshing the baseline
      // doesn't silently drop documented gaps.
      parity: { knownDivergences },
    };
    writeFileSync(baselinePath, JSON.stringify(next, null, 2) + '\n');
    log(`  ↻ wrote baseline → ${baselinePath}`);
    if (parityViolations.length > 0) {
      log(`  ⚠ baseline updated, but ${parityViolations.length} cross-engine parity gap(s) are NOT in knownDivergences:`);
      for (const v of parityViolations) log(`     • ${v}`);
      log(`     Add explicit entries to parity.knownDivergences with a reason, or fix the engine gap.`);
    }
    cleanup(workdir);
    return;
  }

  if (!existingBaseline) {
    throw new Error(`baseline missing: ${baselinePath} (run with --update-baseline)`);
  }
  const baseline = existingBaseline;
  const diff = diffFindings(baseline, observed);
  if (diff.length > 0) {
    console.error(`\n  ✗ ${pkgName}: artifact-smoke output differs from baseline:`);
    for (const line of diff) console.error(`    • ${line}`);
    console.error('\n  To accept the new output as canonical:');
    console.error(`    npm run verify:artifact -- --package ${pkgName} --update-baseline`);
    cleanup(workdir);
    process.exit(1);
  }
  if (parityViolations.length > 0) {
    console.error(`\n  ✗ ${pkgName}: cross-engine parity broken (not in knownDivergences):`);
    for (const v of parityViolations) console.error(`    • ${v}`);
    console.error('\n  Either fix the engine gap, or document it with a reason:');
    console.error(`    edit ${baselinePath} → parity.knownDivergences["<ruleId>@<line>"] = "why this is OK"`);
    cleanup(workdir);
    process.exit(1);
  }

  console.log(`  ✅ ${pkgName} — artifact verified on ESLint + oxlint, ${eslintFindings.length} ESLint findings, ${oxlintFindings.length} oxlint findings (subset of ${ruleSubset.length} rules), parity OK (${Object.keys(knownDivergences).length} accepted divergences)`);
  cleanup(workdir);
}

/**
 * Compare ESLint and oxlint findings on the SAME fixture, restricted to
 * the rule subset that has an oxlint shim. Any (rule, line) pair that
 * appears in one engine but not the other is a parity violation —
 * unless the baseline's knownDivergences allow-list documents it.
 */
function computeParityViolations(
  eslintFindings: Finding[],
  oxlintFindings: Finding[],
  ruleSubset: string[],
  knownDivergences: Record<string, string>,
): string[] {
  // Both engines emit findings as `<short>/<rule>` after our normalization.
  // ruleSubset is bare rule names ("no-redos-vulnerable-regex"); the
  // findings are namespaced ("secure-coding/no-redos-vulnerable-regex").
  // Match by suffix.
  const portable = new Set(ruleSubset);
  const isPortable = (ruleId: string) => {
    const tail = ruleId.includes('/') ? ruleId.split('/').slice(1).join('/') : ruleId;
    return portable.has(tail);
  };
  const key = (f: Finding) => `${f.ruleId}@${f.line}`;
  const eslintKeys = new Set(eslintFindings.filter((f) => isPortable(f.ruleId)).map(key));
  const oxlintKeys = new Set(oxlintFindings.filter((f) => isPortable(f.ruleId)).map(key));

  const out: string[] = [];
  for (const k of oxlintKeys) {
    if (!eslintKeys.has(k) && !knownDivergences[k]) {
      out.push(`oxlint emits ${k} but ESLint does not`);
    }
  }
  for (const k of eslintKeys) {
    if (!oxlintKeys.has(k) && !knownDivergences[k]) {
      out.push(`ESLint emits ${k} but oxlint does not`);
    }
  }
  return out;
}

function parseArgs(argv: string[]): { package?: string; all?: boolean; 'update-baseline'?: boolean } {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') { out.all = true; continue; }
    if (arg === '--update-baseline') { out['update-baseline'] = true; continue; }
    if (arg === '--package') { out.package = argv[++i]; continue; }
    if (arg.startsWith('--package=')) { out.package = arg.slice('--package='.length); continue; }
  }
  return out;
}

function run(cmd: string, argv: string[], cwd: string): void {
  const r = spawnSync(cmd, argv, { cwd, encoding: 'utf-8', stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`${cmd} ${argv.join(' ')} exited ${r.status}`);
}

function packPackage(pkgDir: string, destDir: string): string {
  // `npm pack --json` prints metadata to stdout when --json is set; the
  // tarball file is written to cwd unless --pack-destination is set.
  const r = spawnSync('npm', ['pack', '--json', '--pack-destination', destDir], {
    cwd: pkgDir, encoding: 'utf-8',
  });
  if (r.status !== 0) {
    console.error(r.stderr);
    throw new Error(`npm pack failed for ${pkgDir}`);
  }
  const meta = JSON.parse(r.stdout.trim()) as Array<{ filename: string }>;
  if (!meta[0]?.filename) throw new Error(`npm pack produced no filename for ${pkgDir}`);
  return join(destDir, meta[0].filename);
}

function structuralSmokeProgram(pkgName: string): string {
  // Stays inline as a Node -e program because we want to exercise the
  // exact CommonJS resolution the published consumer would use.
  return `
    const plugin = require(${JSON.stringify(pkgName)});
    const rules = plugin.rules || {};
    const configs = plugin.configs || {};
    const ruleIds = Object.keys(rules);
    if (ruleIds.length === 0) {
      console.error('plugin has no rules');
      process.exit(1);
    }
    for (const id of ruleIds) {
      const r = rules[id];
      if (!r || typeof r.create !== 'function') {
        console.error('rule ' + id + ' is missing create()');
        process.exit(1);
      }
      if (!r.meta || !r.meta.messages) {
        console.error('rule ' + id + ' is missing meta.messages');
        process.exit(1);
      }
    }
    // Prefer 'flagship' if present (the locked, recommended preset),
    // otherwise 'recommended', otherwise the first config.
    const configKey = configs.flagship ? 'flagship'
      : configs.recommended ? 'recommended'
      : Object.keys(configs)[0] || null;
    if (!configKey) {
      console.error('plugin exposes no configs');
      process.exit(1);
    }
    console.log(JSON.stringify({
      ruleCount: ruleIds.length,
      configs: Object.keys(configs),
      configKey,
    }));
  `;
}

function eslintFlatConfig(pkgName: string, configKey: string): string {
  // Plugin namespace must match the rule-key prefix the preset uses. We
  // derive it from the first preset rule key (e.g. 'secure-coding/foo' →
  // 'secure-coding'); fall back to the short package name if the preset
  // rule keys are bare.
  return `import plugin from ${JSON.stringify(pkgName)};
import parser from '@typescript-eslint/parser';

const preset = plugin.configs[${JSON.stringify(configKey)}];
const presetRules = (Array.isArray(preset) ? preset[0]?.rules : preset?.rules) ?? {};

const firstRuleKey = Object.keys(presetRules)[0] || '';
const namespace = firstRuleKey.includes('/')
  ? firstRuleKey.split('/')[0]
  : ${JSON.stringify(pluginShortName(pkgName))};

// Force-enable every rule in the preset at error level (presets sometimes
// use 'warn'). We want the smoke test to surface findings, not warnings —
// both severities matter in a baseline diff.
const rules = Object.fromEntries(Object.entries(presetRules).map(([k]) => [k, 'error']));

export default [
  {
    files: ['**/*.{js,ts,jsx,tsx}'],
    languageOptions: { parser, ecmaVersion: 'latest', sourceType: 'module' },
    plugins: { [namespace]: plugin },
    rules,
  },
];
`;
}

function pluginShortName(pkgName: string): string {
  // eslint-plugin-secure-coding → 'secure-coding'
  return pkgName.replace(/^eslint-plugin-/, '');
}

function runEslint(projectDir: string): Finding[] {
  const r = spawnSync(
    'npx',
    ['eslint', '--no-warn-ignored', '--format', 'json', 'fixture.js'],
    { cwd: projectDir, encoding: 'utf-8' },
  );
  // ESLint exits 1 when there are findings — that's expected.
  if (r.status !== 0 && r.status !== 1) {
    console.error(r.stdout); console.error(r.stderr);
    throw new Error(`eslint failed with exit code ${r.status}`);
  }
  let raw = r.stdout.trim();
  if (!raw) raw = '[]';
  const result = JSON.parse(raw) as Array<{ messages: Array<{ ruleId: string | null; line: number; messageId?: string }> }>;
  const findings: Finding[] = [];
  for (const file of result) {
    for (const m of file.messages) {
      if (!m.ruleId) continue;
      findings.push({ ruleId: m.ruleId, line: m.line, ...(m.messageId ? { messageId: m.messageId } : {}) });
    }
  }
  return sortFindings(findings);
}

function runOxlint(projectDir: string, pkgName: string, _fixtureTarget: string): { findings: Finding[]; ruleSubset: string[] } {
  // Find the oxlint shim for this plugin. The shim convention is
  // `tools/oxlint-plugins/interlace-<short>.cjs`.
  const shimName = `interlace-${pluginShortName(pkgName)}.cjs`;
  const shimPath = join(SHIMS_DIR, shimName);
  if (!existsSync(shimPath)) {
    log(`  ⚠ no oxlint shim at ${shimName} — skipping oxlint smoke`);
    return { findings: [], ruleSubset: [] };
  }

  // Probe the shim to enumerate rule IDs (so we can enable them all).
  const probe = spawnSync('node', ['-e',
    `const p = require(${JSON.stringify(shimPath)}); console.log(JSON.stringify(Object.keys(p.rules||{})));`
  ], { encoding: 'utf-8' });
  if (probe.status !== 0) {
    console.error(probe.stderr);
    throw new Error('failed to enumerate rules from oxlint shim');
  }
  const ruleIds = JSON.parse(probe.stdout.trim()) as string[];

  const shortName = pluginShortName(pkgName);
  const rules: Record<string, string> = {};
  for (const id of ruleIds) rules[`${shortName}/${id}`] = 'error';

  const configPath = join(projectDir, '.oxlintrc.json');
  writeFileSync(configPath, JSON.stringify({
    plugins: [],
    categories: {
      correctness: 'off', suspicious: 'off', perf: 'off',
      pedantic: 'off', style: 'off', restriction: 'off', nursery: 'off',
    },
    jsPlugins: [{ name: shortName, specifier: shimPath }],
    rules,
  }, null, 2) + '\n');

  const r = spawnSync('npx', ['oxlint', '--config', configPath, '--format', 'json', 'fixture.js'],
    { cwd: projectDir, encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024 });
  // oxlint also exits non-zero on findings.
  if (r.status !== 0 && r.status !== 1 && r.status !== null) {
    if (!r.stdout) {
      console.error(r.stderr);
      throw new Error(`oxlint failed with exit code ${r.status}`);
    }
  }
  const raw = (r.stdout || '').trim();
  if (!raw) return { findings: [], ruleSubset: ruleIds };
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch {
    console.error('oxlint returned non-JSON output:'); console.error(raw.slice(0, 400));
    throw new Error('oxlint JSON parse failed');
  }
  const diagnostics = (parsed.diagnostics ?? []) as Array<{
    code?: string;
    labels?: Array<{ span?: { line?: number; column?: number } }>;
    message?: string;
  }>;
  const findings: Finding[] = [];
  for (const d of diagnostics) {
    // Strip the prefix wrapper oxlint puts around plugin rule IDs
    // ("secure-coding(no-hardcoded-credentials)" → "secure-coding/no-hardcoded-credentials")
    // so this lines up with the eslint side's `secure-coding/<rule>` form.
    const rawCode = d.code ?? '';
    const m = rawCode.match(/^([^(]+)\(([^)]+)\)$/);
    const ruleId = m ? `${m[1]}/${m[2]}` : rawCode;
    const line = d.labels?.[0]?.span?.line ?? 0;
    findings.push({ ruleId, line });
  }
  return { findings: sortFindings(findings), ruleSubset: ruleIds };
}

function sortFindings(f: Finding[]): Finding[] {
  return [...f].sort((a, b) =>
    a.ruleId.localeCompare(b.ruleId) || a.line - b.line || (a.messageId ?? '').localeCompare(b.messageId ?? ''),
  );
}

function diffFindings(baseline: Baseline, observed: Pick<Baseline, 'eslint' | 'oxlint'>): string[] {
  const out: string[] = [];
  diffArray('eslint', baseline.eslint.findings, observed.eslint.findings, out);
  diffArray('oxlint', baseline.oxlint.findings, observed.oxlint.findings, out);
  return out;
}

function diffArray(label: string, a: Finding[], b: Finding[], out: string[]): void {
  const aKey = (x: Finding) => `${x.ruleId}@${x.line}/${x.messageId ?? ''}`;
  const aSet = new Set(a.map(aKey));
  const bSet = new Set(b.map(aKey));
  for (const k of aSet) if (!bSet.has(k)) out.push(`${label}: missing  ${k}`);
  for (const k of bSet) if (!aSet.has(k)) out.push(`${label}: extra    ${k}`);
}

function log(msg: string): void { console.log(`  → ${msg}`); }
function cleanup(workdir: string): void { try { rmSync(workdir, { recursive: true, force: true }); } catch { /* best-effort */ } }

// Silence unused warning — keep import shape for future use.
void basename;
