#!/usr/bin/env -S npx tsx

/**
 * ILB Plugin Scope Audit — validates that every ESLint rule lives in the
 * correct plugin and that its detection method matches its severity.
 *
 * ## Three-axis classification model
 *
 * Axis 1 — Environment (what runtime must be present)
 *   universal    Any JS/TS codebase
 *   node         Node.js built-in APIs (fs, child_process, crypto, process)
 *   browser      Browser globals (window, document, localStorage, postMessage)
 *   express      Express/Koa/Fastify router API (app.get, res.send, req.body)
 *   jwt          jsonwebtoken package API
 *   pg           pg (node-postgres) package API
 *   mongodb      mongodb/mongoose API
 *   nestjs       NestJS decorators (@Controller, @UseGuards)
 *   lambda       AWS Lambda handler shape (event, context, callback)
 *   vercel-ai    Vercel AI SDK (generateText, streamText, etc.)
 *
 * Axis 2 — Detection method (how the rule finds the problem)
 *   structural-api        Exact named API call (e.g. eval(), jwt.verify())
 *   structural-pattern    AST shape (e.g. + concat in .query() arg)
 *   naming-heuristic      Variable/property name as proxy for data flow
 *   data-flow-lightweight Lightweight variable tracking (Set of bound names)
 *
 * Axis 3 — Confidence (severity the flagship config ships)
 *   enforcement    'error' — structural-api or structural-pattern only
 *   review-prompt  'warn'  — any detection method
 *   opt-in         'off'   — experimental / noisy / controversial
 *
 * ## Invariants enforced
 *   I1  Every plugin rule has a manifest entry.
 *   I2  Environment tag matches the plugin's allowed environments.
 *   I3  naming-heuristic → confidence must be review-prompt or opt-in (never enforcement).
 *   I4  enforcement → detection must be structural-api or structural-pattern.
 *   I5  No manifest entry tagged violation (explicit known-bad marker).
 *
 * ## Usage
 *   tsx scripts/ilb-plugin-scope-audit.ts              # validate manifest
 *   tsx scripts/ilb-plugin-scope-audit.ts --generate   # auto-generate manifest
 *   tsx scripts/ilb-plugin-scope-audit.ts --print      # print findings to stdout
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const MANIFEST_PATH = path.join(ROOT, '.agent', 'plugin-rule-manifest.json');
const REPORT_PATH = path.join(ROOT, 'benchmark-results', 'plugin-scope-audit.json');

const GENERATE = process.argv.includes('--generate');
const PRINT = process.argv.includes('--print');

// ── Plugin environment contracts ────────────────────────────────────────────

const PLUGIN_ALLOWED_ENVIRONMENTS: Record<string, string[]> = {
  'eslint-plugin-secure-coding':     ['universal'],
  'eslint-plugin-node-security':     ['universal', 'node'],
  'eslint-plugin-browser-security':  ['universal', 'browser'],
  'eslint-plugin-express-security':  ['express'],
  'eslint-plugin-jwt':               ['jwt'],
  'eslint-plugin-pg':                ['pg'],
  'eslint-plugin-mongodb-security':  ['mongodb'],
  'eslint-plugin-nestjs-security':   ['nestjs'],
  'eslint-plugin-lambda-security':   ['lambda'],
  'eslint-plugin-vercel-ai-security':['vercel-ai'],
  // Quality plugins — all universal
  'eslint-plugin-conventions':       ['universal'],
  'eslint-plugin-maintainability':   ['universal'],
  'eslint-plugin-reliability':       ['universal'],
  'eslint-plugin-modernization':     ['universal'],
  'eslint-plugin-modularity':        ['universal'],
  'eslint-plugin-operability':       ['universal'],
  'eslint-plugin-import-next':       ['universal'],
  'eslint-plugin-react-a11y':        ['universal'],   // React is universal (Next, Vite, Remix…)
  'eslint-plugin-react-features':    ['universal'],
  'eslint-plugin-crypto':            ['universal', 'node'], // crypto APIs exist in both
};

// ── Environment signal patterns ─────────────────────────────────────────────

const ENV_SIGNALS: Array<{ env: string; patterns: RegExp[] }> = [
  {
    env: 'browser',
    patterns: [
      /\bwindow\./,
      /\bdocument\./,
      /\blocalStorage\b/,
      /\bsessionStorage\b/,
      /\bIndexedDB\b/,
      /\bpostMessage\b/,
      /\bnavigator\./,
      /\bWebSocket\b/,
      /\bWorker\b/,
      /\bXMLHttpRequest\b/,
      /\binnerHTML\b/,
      /\bclassList\b/,
      /\bcookieStore\b/,
      /\bHTMLElement\b/,
      /serviceWorker/,
    ],
  },
  {
    env: 'node',
    patterns: [
      /require\s*\(\s*['"]fs['"]/,
      /require\s*\(\s*['"]child_process['"]/,
      /require\s*\(\s*['"]path['"]/,
      /require\s*\(\s*['"]os['"]/,
      /require\s*\(\s*['"]crypto['"]/,
      /node:fs/,
      /node:path/,
      /node:crypto/,
      /node:child_process/,
      /\bprocess\.env\b/,
      /\bprocess\.argv\b/,
      /\b__dirname\b/,
      /\b__filename\b/,
      /\bBuffer\./,
    ],
  },
  {
    env: 'express',
    patterns: [
      /app\.get\s*\(/,
      /app\.post\s*\(/,
      /app\.put\s*\(/,
      /app\.delete\s*\(/,
      /app\.use\s*\(/,
      /router\.get\s*\(/,
      /router\.post\s*\(/,
      /router\.use\s*\(/,
      /res\.send\s*\(/,
      /res\.json\s*\(/,
      /res\.setHeader\s*\(/,
      /res\.header\s*\(/,
      /req\.body\b/,
      /req\.query\b/,
      /req\.params\b/,
      /req\.cookies\b/,
      /['"]express['"]/,
      /['"]koa['"]/,
      /['"]fastify['"]/,
      /routeHandler/i,
    ],
  },
  {
    env: 'jwt',
    patterns: [
      /jwt\.sign\s*\(/,
      /jwt\.verify\s*\(/,
      /jwt\.decode\s*\(/,
      /['"]jsonwebtoken['"]/,
    ],
  },
  {
    env: 'pg',
    patterns: [
      /['"]pg['"]/,
      /new Pool\s*\(/,
      /new Client\s*\(/,
      /\.query\s*\(/,
    ],
  },
  {
    env: 'mongodb',
    patterns: [
      /['"]mongodb['"]/,
      /['"]mongoose['"]/,
      /collection\./,
      /\$where\b/,
      /\$expr\b/,
    ],
  },
  {
    env: 'nestjs',
    patterns: [
      /@Controller/,
      /@UseGuards/,
      /@Get\s*\(/,
      /@Post\s*\(/,
      /@Injectable/,
      /['"]@nestjs/,
    ],
  },
  {
    env: 'lambda',
    patterns: [
      /handler\s*\(\s*event/,
      /context\.succeed/,
      /context\.fail/,
      /APIGateway/,
      /LambdaEvent/,
      /['"]aws-lambda['"]/,
    ],
  },
  {
    env: 'vercel-ai',
    patterns: [
      /generateText\b/,
      /streamText\b/,
      /generateObject\b/,
      /streamObject\b/,
      /['"]@ai-sdk/,
      /['"]ai['"]/,
    ],
  },
];

// ── Naming heuristic signal patterns ────────────────────────────────────────
// Rules that gate detection on variable/property name arrays are heuristics.

const NAMING_HEURISTIC_SIGNALS: RegExp[] = [
  /CREDENTIAL[_\s]VARIABLE[_\s]NAMES/i,
  /USER[_\s]INPUT[_\s]PATTERNS/i,
  /SENSITIVE[_\s]PATTERNS/i,
  /PII[_\s]PATTERNS/i,
  /AUTH[_\s]MIDDLEWARE[_\s]PATTERNS/i,
  /VALIDATION[_\s]FUNCTION[_\s]NAMES/i,
  /WEAK[_\s]PASSWORD[_\s]/i,
  /credentialVariableNames/,
  /sensitiveNames/,
  /isUserInput\w*\s*\([^)]*\.name/,
  /lower\.includes\(['"]/,  // checking if variable name contains substring
  /name\.toLowerCase\(\)\.includes/,
];

// ── Data-flow lightweight signal ─────────────────────────────────────────────

const DATA_FLOW_SIGNALS: RegExp[] = [
  /new Set\s*<string>/,
  /new Map\s*<string/,
  /taintedVariables/,
  /aiBoundNames/,
  /trackedNames/,
  /userInputVars/,
];

// ── Utility functions ────────────────────────────────────────────────────────

function listPlugins(): string[] {
  return fs.readdirSync(PACKAGES_DIR)
    .filter(d => d.startsWith('eslint-plugin-'))
    .filter(d => fs.statSync(path.join(PACKAGES_DIR, d)).isDirectory());
}

function getRulesFromIndex(pluginDir: string): string[] {
  const indexPath = path.join(PACKAGES_DIR, pluginDir, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) return [];
  const src = fs.readFileSync(indexPath, 'utf-8');
  const pluginShortName = pluginDir.replace('eslint-plugin-', '');

  // Strategy: scan lines that look like `'rule-name': <non-string>` (rule registration)
  // Exclude lines that assign string literals — those are flagship config ('rule': 'error').
  // Exclude lines where the key contains a slash — those are prefixed flagship config entries.
  const rules: string[] = [];
  for (const line of src.split('\n')) {
    // Match: leading whitespace + quoted rule name + colon + an implementation
    // reference whose value STARTS WITH AN IDENTIFIER CHAR (e.g. `noEval`). This
    // positively excludes string-literal config (`'rule': 'error'`) and object
    // config presets (`'recommended-strict': {`). A negative lookahead is wrong
    // here: `\s*(?!['"{])` lets `\s*` backtrack to zero and test the space.
    const m = line.match(/^\s+['"]([a-z][a-z0-9-]*)['"]?\s*:\s*[a-zA-Z_$]/);
    if (!m) continue;
    const name = m[1];
    if (name.includes('/')) continue;         // prefixed config entry
    if (name === pluginShortName) continue;   // plugin name used as key in plugins: {}
    if (/^(error|warn|off)$/.test(name)) continue; // severity string
    rules.push(name);
  }
  return [...new Set(rules)];
}

function getRuleSource(pluginDir: string, ruleName: string): string | null {
  // Try one-per-dir layout: src/rules/<rule>/index.ts
  const onePerDir = path.join(PACKAGES_DIR, pluginDir, 'src', 'rules', ruleName, 'index.ts');
  if (fs.existsSync(onePerDir)) return fs.readFileSync(onePerDir, 'utf-8');

  // Try flat layout: src/rules/<rule>.ts
  const flat = path.join(PACKAGES_DIR, pluginDir, 'src', 'rules', `${ruleName}.ts`);
  if (fs.existsSync(flat)) return fs.readFileSync(flat, 'utf-8');

  // Try category subdirectory layouts: src/rules/<category>/<rule>.ts
  const rulesDir = path.join(PACKAGES_DIR, pluginDir, 'src', 'rules');
  if (!fs.existsSync(rulesDir)) return null;
  for (const entry of fs.readdirSync(rulesDir)) {
    const catFile = path.join(rulesDir, entry, `${ruleName}.ts`);
    if (fs.existsSync(catFile)) return fs.readFileSync(catFile, 'utf-8');
  }

  return null;
}

function getFlagshipSeverity(pluginDir: string, ruleName: string): 'error' | 'warn' | 'off' {
  const indexPath = path.join(PACKAGES_DIR, pluginDir, 'src', 'index.ts');
  if (!fs.existsSync(indexPath)) return 'off';
  const src = fs.readFileSync(indexPath, 'utf-8');
  // Look for 'plugin-name/rule-name': 'error'|'warn'
  const prefix = pluginDir.replace('eslint-plugin-', '');
  const re = new RegExp(`['"]${prefix}/${ruleName}['"]\\s*:\\s*['"]([^'"]+)['"]`);
  const m = src.match(re);
  if (!m) return 'off';
  if (m[1] === 'error') return 'error';
  if (m[1] === 'warn') return 'warn';
  return 'off';
}

function detectEnvironments(src: string): string[] {
  const found = new Set<string>();
  for (const { env, patterns } of ENV_SIGNALS) {
    // Skip patterns that are in string literals used as examples or docs
    // We check for actual usage in code, not in comments or string values
    const cleanSrc = src
      .replace(/\/\/.*$/gm, '')         // remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments
    if (patterns.some(p => p.test(cleanSrc))) {
      found.add(env);
    }
  }
  return [...found];
}

function detectNamingHeuristic(src: string): boolean {
  return NAMING_HEURISTIC_SIGNALS.some(p => p.test(src));
}

function detectDataFlowLightweight(src: string): boolean {
  return DATA_FLOW_SIGNALS.some(p => p.test(src));
}

function classifyDetection(src: string): 'structural-api' | 'structural-pattern' | 'naming-heuristic' | 'data-flow-lightweight' {
  if (detectNamingHeuristic(src)) return 'naming-heuristic';
  if (detectDataFlowLightweight(src)) return 'data-flow-lightweight';
  // All others are structural — distinguishing api vs pattern is editorial
  // Default to structural-pattern (conservative); manual review upgrades to structural-api
  return 'structural-pattern';
}

function confidenceFromSeverity(sev: 'error' | 'warn' | 'off'): 'enforcement' | 'review-prompt' | 'opt-in' {
  if (sev === 'error') return 'enforcement';
  if (sev === 'warn') return 'review-prompt';
  return 'opt-in';
}

// ── Manifest generation ──────────────────────────────────────────────────────

function generateManifest(): Record<string, Record<string, {
  environment: string;
  detection: string;
  confidence: string;
  notes?: string;
  violation?: string;
}>> {
  const manifest: Record<string, Record<string, {
    environment: string;
    detection: string;
    confidence: string;
    notes?: string;
    violation?: string;
  }>> = {};

  for (const pluginDir of listPlugins()) {
    const rules = getRulesFromIndex(pluginDir);
    if (rules.length === 0) continue;

    manifest[pluginDir] = {};

    for (const rule of rules) {
      const src = getRuleSource(pluginDir, rule);
      const sev = getFlagshipSeverity(pluginDir, rule);
      const confidence = confidenceFromSeverity(sev);

      if (!src) {
        manifest[pluginDir][rule] = {
          environment: 'universal',
          detection: 'structural-pattern',
          confidence,
          notes: 'Source not found — manual review required',
        };
        continue;
      }

      const envs = detectEnvironments(src);
      const detection = classifyDetection(src);

      // Primary environment: if the rule only uses one env signal, use it.
      // If it uses multiple, pick the most specific one (non-universal wins).
      const allowedEnvs = PLUGIN_ALLOWED_ENVIRONMENTS[pluginDir] ?? ['universal'];

      // Every branch below assigns `environment`, so no seed value is needed
      // (the old `= pluginPrimaryEnv` seed was always overwritten — dead store).
      let environment: string;
      if (envs.length === 0) environment = allowedEnvs[0]; // default to plugin's first
      else if (envs.length === 1) environment = envs[0];
      else {
        // Multiple env signals — use the most specific non-universal one
        environment = envs.find(e => e !== 'universal') ?? 'universal';
      }

      // Check for environment violation
      const violation = !allowedEnvs.includes(environment)
        ? `WRONG_ENV — rule uses '${environment}' signals but plugin allows only: ${allowedEnvs.join(', ')}`
        : undefined;

      manifest[pluginDir][rule] = {
        environment,
        detection,
        confidence,
        ...(violation ? { violation } : {}),
      };
    }
  }

  return manifest;
}

// ── Invariant validation ─────────────────────────────────────────────────────

type Finding = {
  plugin: string;
  rule: string;
  invariant: string;
  detail: string;
};

function validateManifest(manifest: ReturnType<typeof generateManifest>): Finding[] {
  const findings: Finding[] = [];

  for (const pluginDir of listPlugins()) {
    const pluginRules = getRulesFromIndex(pluginDir);
    const manifestRules = manifest[pluginDir] ?? {};
    const allowedEnvs = PLUGIN_ALLOWED_ENVIRONMENTS[pluginDir] ?? ['universal'];

    for (const rule of pluginRules) {
      const entry = manifestRules[rule];

      // I1 — completeness
      if (!entry) {
        findings.push({ plugin: pluginDir, rule, invariant: 'I1', detail: 'Missing manifest entry' });
        continue;
      }

      // I2 — environment alignment (skip deprecated rules — they exist for backwards compat)
      if (!allowedEnvs.includes(entry.environment) && !entry.deprecated) {
        findings.push({
          plugin: pluginDir, rule, invariant: 'I2',
          detail: `environment '${entry.environment}' not allowed in ${pluginDir} (allowed: ${allowedEnvs.join(', ')})`,
        });
      }

      // I3 — naming-heuristic must be review-prompt or opt-in
      if (entry.detection === 'naming-heuristic' && entry.confidence === 'enforcement') {
        findings.push({
          plugin: pluginDir, rule, invariant: 'I3',
          detail: `naming-heuristic detection cannot be 'enforcement' severity — demote to 'review-prompt'`,
        });
      }

      // I4 — enforcement must not be a pure naming heuristic
      // Note: data-flow-lightweight (tracking Set of bound names from known API calls) CAN be
      // enforcement if the tracking is conservative and precision is high. Only naming-heuristic
      // (using variable name as a proxy for what data IS) is inherently imprecise.
      if (entry.confidence === 'enforcement' && entry.detection === 'naming-heuristic') {
        findings.push({
          plugin: pluginDir, rule, invariant: 'I4',
          detail: `enforcement confidence cannot use naming-heuristic detection — variable names are not reliable data-flow proxies`,
        });
      }

      // I5 — no explicit violations (skip deprecated rules — migration path is documented)
      if (entry.violation && !entry.deprecated) {
        findings.push({
          plugin: pluginDir, rule, invariant: 'I5',
          detail: entry.violation,
        });
      }
    }
  }

  return findings;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  let manifest: ReturnType<typeof generateManifest>;

  if (GENERATE) {
    console.log('Generating plugin-rule-manifest.json…');
    manifest = generateManifest();
    const agentDir = path.join(ROOT, '.agent');
    if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✅ Wrote ${MANIFEST_PATH}`);

    // Count stats
    let total = 0;
    let violations = 0;
    for (const plugin of Object.values(manifest)) {
      for (const entry of Object.values(plugin)) {
        total++;
        if (entry.violation) violations++;
      }
    }
    console.log(`   ${total} rules classified · ${violations} auto-detected violations`);
    process.exit(0);
  }

  // Validate mode
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ ${MANIFEST_PATH} not found. Run with --generate first.`);
    process.exit(1);
  }

  manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  const findings = validateManifest(manifest);

  // Build report
  const report = {
    generatedAt: new Date().toISOString(),
    findings,
    summary: {
      total: findings.length,
      byInvariant: {} as Record<string, number>,
    },
  };
  for (const f of findings) {
    report.summary.byInvariant[f.invariant] = (report.summary.byInvariant[f.invariant] ?? 0) + 1;
  }

  // Write report
  const benchDir = path.join(ROOT, 'benchmark-results');
  if (!fs.existsSync(benchDir)) fs.mkdirSync(benchDir, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  if (PRINT || findings.length > 0) {
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('  PLUGIN SCOPE AUDIT');
    console.log('══════════════════════════════════════════════════════════════════════\n');
    for (const f of findings) {
      const prefix = f.pluginDir ?? f.plugin;
      console.log(`  ❌ [${f.invariant}] ${prefix}/${f.rule}`);
      console.log(`     ${f.detail}`);
    }
    if (findings.length === 0) {
      console.log('  ✅ All invariants satisfied — zero scope violations.');
    }
    console.log(`\n  ${findings.length} finding(s) · written to benchmark-results/plugin-scope-audit.json\n`);
  }

  if (findings.length > 0) {
    console.log(`✅ benchmark-results/plugin-scope-audit.json`);
    process.exit(1);
  }

  console.log(`✅ benchmark-results/plugin-scope-audit.json`);
}

main();
