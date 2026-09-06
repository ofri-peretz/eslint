#!/usr/bin/env node

/**
 * FN/FP Benchmark Runner — Expanded Ecosystem Comparison
 *
 * Compares False Negatives (missed vulnerabilities) and False Positives
 * (incorrectly flagged safe code) across ALL major ESLint plugins.
 *
 * Competitors benchmarked:
 *   1. eslint-plugin-security       — Legacy incumbent (1.5M+ weekly downloads)
 *   2. eslint-plugin-sonarjs        — SonarSource (269 rules, 44 security-relevant)
 *   3. @microsoft/eslint-plugin-sdl — Microsoft SDL (17 rules)
 *   4. eslint-plugin-no-secrets     — Secret detection (2 rules)
 *   5. eslint-plugin-unicorn        — Best practices (144 rules)
 *   6. eslint-plugin-react          — React security (103 rules)
 *   7. eslint-plugin-jsx-a11y       — Accessibility (39 rules)
 *   8. eslint-plugin-n              — Node.js (41 rules)
 *   9. Interlace Fleet              — Our ecosystem (84+ security rules)
 *
 * Usage:
 *   node benchmarks/fn-fp-comparison/run.js
 *   node benchmarks/fn-fp-comparison/run.js --plugin=sonarjs     # Run single plugin
 *   node benchmarks/fn-fp-comparison/run.js --plugin=interlace   # Run single plugin
 *
 * Output:
 *   results/fn-fp-comparison/YYYY-MM-DD.json
 */

import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { ESLint } from 'eslint';
import semver from 'semver';
import {
  NPM_PACKAGE_NAMES,
  OUR_PLUGIN_NAME,
  UNSUPPORTED,
  crash,
  crashMessage,
  declaresSupportFor,
  peerEslintRange,
} from './peer-support.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Import expected detections from fixtures
import {
  EXPECTED_DETECTIONS,
  TOTAL_EXPECTED_VULNERABILITIES,
} from './fixtures/vulnerable/vulnerable.js';
import {
  EXPECTED_NO_DETECTIONS,
  TOTAL_SAFE_PATTERNS,
} from './fixtures/safe/safe-patterns.js';

// =============================================================================
// CONFIGURATION — ALL COMPETITORS
// =============================================================================

const ALL_PLUGINS = [
  {
    name: 'eslint-plugin-security',
    displayName: 'eslint-plugin-security',
    config: './configs/eslint-plugin-security.config.js',
    rules: 13,
    lastUpdated: '2023 (maintenance mode)',
    weeklyDownloads: '1.5M+',
    category: 'Security',
  },
  {
    name: 'security-node',
    displayName: 'eslint-plugin-security-node',
    config: './configs/security-node.config.js',
    rules: 22,
    lastUpdated: '2023',
    weeklyDownloads: '~30K',
    category: 'Security (Node.js)',
  },
  {
    name: 'sonarjs',
    displayName: 'eslint-plugin-sonarjs (SonarSource)',
    config: './configs/sonarjs.config.js',
    rules: 269,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '3M+',
    category: 'Security + Quality',
  },
  {
    name: 'microsoft-sdl',
    displayName: '@microsoft/eslint-plugin-sdl',
    config: './configs/microsoft-sdl.config.js',
    rules: 17,
    lastUpdated: '2024 (active)',
    weeklyDownloads: '~100K',
    category: 'Security (SDL)',
  },
  {
    name: 'no-secrets',
    displayName: 'eslint-plugin-no-secrets',
    config: './configs/no-secrets.config.js',
    rules: 2,
    lastUpdated: '2023',
    weeklyDownloads: '~50K',
    category: 'Secret Detection',
  },
  {
    name: 'unicorn',
    displayName: 'eslint-plugin-unicorn',
    config: './configs/unicorn.config.js',
    rules: 144,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '5M+',
    category: 'Best Practices',
  },
  {
    name: 'react',
    displayName: 'eslint-plugin-react',
    config: './configs/react.config.js',
    rules: 103,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '15M+',
    category: 'React',
  },
  {
    name: 'jsx-a11y',
    displayName: 'eslint-plugin-jsx-a11y',
    config: './configs/jsx-a11y.config.js',
    rules: 39,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '12M+',
    category: 'Accessibility',
  },
  {
    name: 'eslint-plugin-n',
    displayName: 'eslint-plugin-n',
    config: './configs/eslint-plugin-n.config.js',
    rules: 41,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '8M+',
    category: 'Node.js',
  },
  {
    name: 'import',
    displayName: 'eslint-plugin-import',
    config: './configs/import.config.js',
    rules: 44,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '40M+',
    category: 'Module Resolution',
  },
  {
    name: 'promise',
    displayName: 'eslint-plugin-promise',
    config: './configs/promise.config.js',
    rules: 13,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '10M+',
    category: 'Promise Practices',
  },
  {
    name: 'regexp',
    displayName: 'eslint-plugin-regexp',
    config: './configs/regexp.config.js',
    rules: 78,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '5M+',
    category: 'Regex Quality',
  },
  {
    name: 'no-unsanitized',
    displayName: 'eslint-plugin-no-unsanitized (Mozilla)',
    config: './configs/no-unsanitized.config.js',
    rules: 2,
    lastUpdated: '2023',
    weeklyDownloads: '~500K',
    category: 'DOM XSS',
  },
  {
    name: 'jsdoc',
    displayName: 'eslint-plugin-jsdoc',
    config: './configs/jsdoc.config.js',
    rules: 51,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '3.8M+',
    category: 'Documentation',
    securityRelevant: false, // Flags functions for missing @param, not security issues
  },
  {
    name: 'jest',
    displayName: 'eslint-plugin-jest',
    config: './configs/jest.config.js',
    rules: 71,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '14M+',
    category: 'Testing (Jest)',
  },
  {
    name: 'vue',
    displayName: 'eslint-plugin-vue',
    config: './configs/vue.config.js',
    rules: 250,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '7M+',
    category: 'Vue.js',
  },
  {
    /*
     * Was declared unmeasurable — "needs a TypeScript program" — on the
     * strength of one rule's error message. Bisecting all 50 rules against
     * the corpus showed that 47 run fine and exactly 3 need a program, so the
     * config excludes those 3 by name and the plugin is scored (#897).
     *
     * It scores a real 0, and that is a true measurement rather than the
     * fabricated one it replaces: this corpus is Node/browser security
     * fixtures, and Angular's rules look for Angular TypeScript. A 0 here
     * says the corpus contains nothing in its domain — not that the plugin
     * misses vulnerabilities.
     */
    name: 'angular',
    displayName: '@angular-eslint/eslint-plugin',
    config: './configs/angular.config.js',
    rules: 48,
    lastUpdated: '2025 (active)',
    weeklyDownloads: '2.25M+',
    category: 'Angular',
  },
  {
    name: 'interlace',
    displayName: 'Interlace ESLint Ecosystem',
    config: './configs/interlace.config.js',
    rules: 201, // Full security fleet: 11 plugins
    lastUpdated: 'Weekly',
    weeklyDownloads: '~5K',
    category: 'Security (Full Stack)',
  },
];

const FIXTURE_FILES = {
  vulnerable: path.join(__dirname, 'fixtures/vulnerable/vulnerable.js'),
  safe: path.join(__dirname, 'fixtures/safe/safe-patterns.js'),
};

const OUTPUT_DIR = path.join(__dirname, '../../results/ilb-arena');

// =============================================================================
// CLI ARGUMENT PARSING
// =============================================================================

function getPluginsToTest() {
  const args = process.argv.slice(2);
  const pluginArg = args.find((a) => a.startsWith('--plugin='));

  if (pluginArg) {
    const pluginName = pluginArg.split('=')[1];
    const plugin = ALL_PLUGINS.find((p) => p.name === pluginName);
    if (!plugin) {
      console.error(
        `Unknown plugin: ${pluginName}. Available: ${ALL_PLUGINS.map((p) => p.name).join(', ')}`,
      );
      process.exit(1);
    }
    return [plugin];
  }

  return ALL_PLUGINS;
}

// =============================================================================
// ESLINT RUNNER (Node API — loads configs in-process)
// =============================================================================
//
// Why not spawnSync? Our Interlace plugins are TS-source-only with
// `package.json:main` pointing at unbuilt `src/index.js`. The CLI subprocess
// fails ERR_MODULE_NOT_FOUND and the runner used to silently record "0
// findings". With tsx-as-loader at the top level (see package.json script),
// dynamic imports of TS sources resolve, so we can use ESLint's Node API
// with `overrideConfig: <imported-config>` and get real numbers.

/*
 * ESLint 8 cannot take a flat config through `new ESLint({overrideConfigFile:
 * true})` — it rejects it with "'overrideConfigFile' must be a non-empty
 * string or null". Its flat-config engine lives behind the
 * `eslint/use-at-your-own-risk` entry point, and comes off `.default`.
 * v9+ takes flat config on the main export directly.
 */
let enginePromise;
function flatEngine() {
  enginePromise ??= (async () => {
    if (semver.major(semver.coerce(ESLint.version)) >= 9) return ESLint;
    const mod = await import('eslint/use-at-your-own-risk');
    const { FlatESLint } = mod.default ?? mod;
    if (typeof FlatESLint !== 'function') {
      throw new Error(
        `ESLint ${ESLint.version} exposes no FlatESLint; cannot lint flat configs.`,
      );
    }
    return FlatESLint;
  })();
  return enginePromise;
}

const configCache = new Map();

async function loadConfig(configPath) {
  if (configCache.has(configPath)) return configCache.get(configPath);
  const absoluteConfig = path.resolve(__dirname, configPath);
  const url = pathToFileURL(absoluteConfig).href;
  const mod = await import(url);
  const config = mod.default ?? mod;
  configCache.set(configPath, config);
  return config;
}

async function runEslint(configPath, targetFile, pluginName) {
  const absoluteTarget = path.resolve(targetFile);
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (e) {
    // Not a warning. Returning [] here scores the plugin as "found nothing",
    // which is indistinguishable from a plugin that genuinely detects nothing
    // — that is how a stale import in interlace.config.js put Interlace last
    // in ilb-cwe-corpus at F1 0% for two days after #414.
    if (
      pluginName !== undefined &&
      pluginName !== OUR_PLUGIN_NAME &&
      !declaresSupportFor(pluginName, ESLint.version)
    ) {
      // The peer never claimed to run on this ESLint major. Excluding it is
      // the honest reading; crashing the whole matrix leg over someone else's
      // support policy is not.
      return UNSUPPORTED;
    }
    console.error(
      `\n❌ Config failed to load: ${configPath}\n   ${e.message}\n\nRefusing to score.`,
    );
    process.exit(3);
  }

  try {
    const Engine = await flatEngine();
    const eslint = new Engine({
      cwd: __dirname,
      overrideConfigFile: true,
      overrideConfig: config,
    });
    const results = await eslint.lintFiles([absoluteTarget]);
    return results;
  } catch (e) {
    /*
     * A run failure used to return [] with a warning. That is the same
     * vacuity the config-load branch above refuses: [] is indistinguishable
     * from a plugin that genuinely found nothing, and it scores as such.
     * Measured on real ESLint 8 before this changed: 36 run failures, all 18
     * plugins at 0/40 TP and F1 0.0%, exit code 0.
     *
     * unicorn is the live example — its rules need ESLint 10's rule-options
     * semantics and throw "Cannot destructure property 'name' of 'options'"
     * on v8, which is precisely what its `>=10.4` peer range declares. So the
     * same exemption the load branch uses applies here: a peer that never
     * claimed this major is excluded, anything else stops the run.
     */
    if (
      pluginName !== undefined &&
      pluginName !== OUR_PLUGIN_NAME &&
      !declaresSupportFor(pluginName, ESLint.version)
    ) {
      return UNSUPPORTED;
    }
    /*
     * A peer that DECLARES this ESLint and throws anyway is an upstream
     * defect. Exiting here is honest about that one plugin and dishonest
     * about the other seventeen: it leaves the whole matrix unmeasured, so
     * the arena publishes nothing and the last published numbers — which
     * contain the very zeros #891 set out to kill — stay the newest ones.
     *
     * unicorn 72.0.0 is the live case. It declares `eslint: ">=10.4"`, we run
     * 10.7.0, and `unicorn/prefer-string-slice` still throws "'text' must be
     * a string" on this corpus.
     *
     * So: recorded, reported, never scored — and never fatal for someone
     * else's bug. Our own plugin still stops the run, because that is ours.
     */
    if (pluginName !== undefined && pluginName !== OUR_PLUGIN_NAME) {
      return crash(e.message?.slice(0, 300) ?? 'unknown runtime failure');
    }
    console.error(
      `\n❌ ESLint run failed for ${configPath}\n   ${e.message?.slice(0, 300)}\n\nRefusing to score.`,
    );
    process.exit(3);
  }
}

/**
 * Extract function-level violations from ESLint results
 */
function extractViolations(eslintResults) {
  const violations = [];

  for (const file of eslintResults) {
    for (const message of file.messages || []) {
      // Skip parsing errors
      if (message.ruleId === null) continue;

      violations.push({
        ruleId: message.ruleId,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
        line: message.line,
        column: message.column,
      });
    }
  }

  return violations;
}

/**
 * Map violations to function names based on line numbers
 */
function mapViolationsToFunctions(violations, sourceCode) {
  const functionViolations = {};
  const lines = sourceCode.split('\n');

  // Find all function declarations with their line ranges
  const functions = [];
  let currentFunction = null;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Detect function declarations
    const funcMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
    if (funcMatch) {
      if (currentFunction) {
        currentFunction.endLine = lineNum - 1;
        functions.push(currentFunction);
      }
      currentFunction = {
        name: funcMatch[1],
        startLine: lineNum,
        endLine: null,
      };
    }
  });

  // Close the last function
  if (currentFunction) {
    currentFunction.endLine = lines.length;
    functions.push(currentFunction);
  }

  // Map violations to functions
  for (const violation of violations) {
    for (const func of functions) {
      if (violation.line >= func.startLine && violation.line <= func.endLine) {
        if (!functionViolations[func.name]) {
          functionViolations[func.name] = [];
        }
        functionViolations[func.name].push(violation);
        break;
      }
    }
  }

  return functionViolations;
}

// =============================================================================
// METRICS CALCULATION
// =============================================================================

function calculateMetrics(vulnerableResults, safeResults) {
  // True Positives: Vulnerabilities correctly detected
  const detectedVulnerabilities = Object.keys(vulnerableResults);
  const TP = detectedVulnerabilities.filter(
    (fn) => fn in EXPECTED_DETECTIONS,
  ).length;

  // False Negatives: Vulnerabilities missed
  const FN = TOTAL_EXPECTED_VULNERABILITIES - TP;

  // False Positives: Safe code incorrectly flagged
  const flaggedSafePatterns = Object.keys(safeResults);
  const FP = flaggedSafePatterns.filter((fn) =>
    EXPECTED_NO_DETECTIONS.includes(fn),
  ).length;

  // True Negatives: Safe code correctly ignored
  const TN = TOTAL_SAFE_PATTERNS - FP;

  // Calculate rates
  const FNR =
    TOTAL_EXPECTED_VULNERABILITIES > 0
      ? ((FN / TOTAL_EXPECTED_VULNERABILITIES) * 100).toFixed(1)
      : 0;
  const FPR =
    TOTAL_SAFE_PATTERNS > 0 ? ((FP / TOTAL_SAFE_PATTERNS) * 100).toFixed(1) : 0;
  const precision = TP + FP > 0 ? ((TP / (TP + FP)) * 100).toFixed(1) : 100;
  const recall = TP + FN > 0 ? ((TP / (TP + FN)) * 100).toFixed(1) : 0;
  const f1Score =
    parseFloat(precision) + parseFloat(recall) > 0
      ? (
          (2 * parseFloat(precision) * parseFloat(recall)) /
          (parseFloat(precision) + parseFloat(recall))
        ).toFixed(1)
      : 0;

  return {
    TP,
    TN,
    FP,
    FN,
    FNR: `${FNR}%`,
    FPR: `${FPR}%`,
    precision: `${precision}%`,
    recall: `${recall}%`,
    f1Score: `${f1Score}%`,
    detectedVulnerabilities,
    missedVulnerabilities: Object.keys(EXPECTED_DETECTIONS).filter(
      (fn) => !detectedVulnerabilities.includes(fn),
    ),
    falsePositives: flaggedSafePatterns,
  };
}

// =============================================================================
// MAIN RUNNER
// =============================================================================

async function runBenchmark() {
  const pluginsToTest = getPluginsToTest();

  console.log('🔬 FN/FP Ecosystem Benchmark: ESLint Plugin Comparison\n');
  console.log('='.repeat(70));
  console.log(
    `   Testing ${pluginsToTest.length} plugin(s) against ${TOTAL_EXPECTED_VULNERABILITIES} vulnerable + ${TOTAL_SAFE_PATTERNS} safe patterns`,
  );
  console.log('='.repeat(70));

  // Read source files
  const vulnerableCode = fs.readFileSync(FIXTURE_FILES.vulnerable, 'utf-8');
  const safeCode = fs.readFileSync(FIXTURE_FILES.safe, 'utf-8');

  console.log(`\n📁 Test Fixtures:`);
  console.log(`   Vulnerable patterns: ${TOTAL_EXPECTED_VULNERABILITIES}`);
  console.log(`   Safe patterns: ${TOTAL_SAFE_PATTERNS}`);

  // Resolve installed plugin versions for article reproducibility
  function getInstalledVersion(pkgName) {
    try {
      // Use resolve to find the package directory, then read its package.json via fs
      const pkgEntrypoint = require.resolve(pkgName);
      // Walk up from entrypoint to find package.json
      let dir = path.dirname(pkgEntrypoint);
      for (let i = 0; i < 5; i++) {
        const candidate = path.join(dir, 'package.json');
        if (fs.existsSync(candidate)) {
          const pkg = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
          if (pkg.name === pkgName) return pkg.version;
        }
        dir = path.dirname(dir);
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Extract code snippet around a violation line for article examples
  function getCodeSnippet(sourceCode, lineNum, context = 2) {
    const lines = sourceCode.split('\n');
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines
      .slice(start, end)
      .map((l, i) => {
        const num = start + i + 1;
        const marker = num === lineNum ? ' >>>' : '    ';
        return `${marker} ${num}: ${l}`;
      })
      .join('\n');
  }

  // Classify vulnerabilities by category
  function getVulnerabilityCategory(fnName) {
    if (fnName.includes('sql')) return 'SQL Injection';
    if (
      fnName.includes('cmd') ||
      fnName.includes('exec') ||
      fnName.includes('spawn')
    )
      return 'Command Injection';
    if (fnName.includes('path')) return 'Path Traversal';
    if (fnName.includes('creds')) return 'Hardcoded Credentials';
    if (fnName.includes('jwt')) return 'JWT Vulnerabilities';
    if (fnName.includes('xss')) return 'XSS';
    if (fnName.includes('proto')) return 'Prototype Pollution';
    if (fnName.includes('random')) return 'Insecure Randomness';
    if (fnName.includes('crypto')) return 'Weak Cryptography';
    if (fnName.includes('timing')) return 'Timing Attacks';
    if (fnName.includes('nosql')) return 'NoSQL Injection';
    if (fnName.includes('ssrf')) return 'SSRF';
    if (fnName.includes('redirect')) return 'Open Redirect';
    if (fnName.includes('redos')) return 'ReDoS';
    return 'Other';
  }

  // Resolve all installed versions

  const installedVersions = {};
  for (const plugin of pluginsToTest) {
    const pkgName = NPM_PACKAGE_NAMES[plugin.name] || plugin.name;
    installedVersions[plugin.name] = getInstalledVersion(pkgName);
  }
  // For Interlace, also resolve all sub-plugin versions
  if (installedVersions.interlace) {
    installedVersions['interlace-detail'] = {
      'eslint-plugin-secure-coding': getInstalledVersion(
        'eslint-plugin-secure-coding',
      ),
      'eslint-plugin-node-security': getInstalledVersion(
        'eslint-plugin-node-security',
      ),
      'eslint-plugin-postgresql-security': getInstalledVersion(
        'eslint-plugin-postgresql-security',
      ),
      'eslint-plugin-jwt-security': getInstalledVersion(
        'eslint-plugin-jwt-security',
      ),
      'eslint-plugin-browser-security': getInstalledVersion(
        'eslint-plugin-browser-security',
      ),
      'eslint-plugin-mongodb-security': getInstalledVersion(
        'eslint-plugin-mongodb-security',
      ),
      'eslint-plugin-express-security': getInstalledVersion(
        'eslint-plugin-express-security',
      ),
      'eslint-plugin-nestjs-security': getInstalledVersion(
        'eslint-plugin-nestjs-security',
      ),
      'eslint-plugin-lambda-security': getInstalledVersion(
        'eslint-plugin-lambda-security',
      ),
      'eslint-plugin-vercel-ai-security': getInstalledVersion(
        'eslint-plugin-vercel-ai-security',
      ),
    };
  }

  const eslintVersion = getInstalledVersion('eslint');

  /*
   * The cross-version matrix swaps ESLint at the repo root, but this workspace
   * declares its own `eslint` devDependency — so npm is free to keep a nested
   * copy that shadows the swap, and the cell then benchmarks the wrong major
   * and passes for the wrong reason. Observed locally: root eslint@8.57.1 with
   * benchmarks/node_modules/eslint@10.10.0 still resolving here.
   *
   * `eslintVersion` above is what this file actually resolves, so the matrix
   * can assert against it. Silent is the only outcome not allowed.
   */
  const expectedMajor = process.env.ILB_EXPECT_ESLINT_MAJOR;
  if (expectedMajor && String(eslintVersion).split('.')[0] !== expectedMajor) {
    console.error(
      `\n❌ Wrong ESLint under test.\n` +
        `   Expected major ${expectedMajor}, resolved ${eslintVersion}.\n` +
        `   A nested benchmarks/node_modules/eslint is shadowing the root install,\n` +
        `   so this cell would score a version it was not asked to test.\n`,
    );
    process.exit(4);
  }
  const nodeVersion = process.version;

  const categories = [
    'SQL Injection',
    'Command Injection',
    'Path Traversal',
    'Hardcoded Credentials',
    'JWT Vulnerabilities',
    'XSS',
    'Prototype Pollution',
    'Insecure Randomness',
    'Weak Cryptography',
    'Timing Attacks',
    'NoSQL Injection',
    'SSRF',
    'Open Redirect',
    'ReDoS',
  ];

  const results = {
    timestamp: new Date().toISOString(),
    benchmarkType: 'security',
    environment: {
      nodeVersion,
      eslintVersion,
      platform: process.platform,
      arch: process.arch,
    },
    installedVersions,
    methodology: {
      approach: 'Static fixture-based comparison',
      description:
        'Each plugin is run in isolation against identical fixture files containing known-vulnerable and known-safe code patterns. Violations are mapped to exported functions to calculate True Positives (correct detections), False Negatives (missed vulnerabilities), False Positives (safe code incorrectly flagged), and True Negatives (safe code correctly passed).',
      vulnerablePatterns: TOTAL_EXPECTED_VULNERABILITIES,
      safePatterns: TOTAL_SAFE_PATTERNS,
      categories,
      expectedDetections: EXPECTED_DETECTIONS,
      expectedNoDetections: EXPECTED_NO_DETECTIONS,
    },
    fixtures: {
      vulnerableFile: FIXTURE_FILES.vulnerable,
      safeFile: FIXTURE_FILES.safe,
    },
    plugins: {},
    summary: {},
  };

  for (const plugin of pluginsToTest) {
    console.log(`\n\n🔍 Testing: ${plugin.displayName}`);
    console.log(
      `   Rules: ${plugin.rules} | Category: ${plugin.category} | Downloads: ${plugin.weeklyDownloads}`,
    );
    console.log('-'.repeat(70));

    if (plugin.unmeasurable) {
      console.log(`   ⊘ Not scored — ${plugin.unmeasurable}.`);
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        unmeasurable: plugin.unmeasurable,
      };
      continue;
    }

    // Run on vulnerable code
    console.log('   Scanning vulnerable.js...');
    const vulnerableRaw = await runEslint(
      plugin.config,
      FIXTURE_FILES.vulnerable,
      plugin.name,
    );
    if (vulnerableRaw === UNSUPPORTED) {
      const range = peerEslintRange(plugin.name);
      console.log(
        `   ⊘ Skipped — declares eslint "${range}", running ${ESLint.version}.`,
      );
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        unsupported: { declaredEslint: range, runningEslint: ESLint.version },
      };
      continue;
    }
    const vulnCrash = crashMessage(vulnerableRaw);
    if (vulnCrash !== null) {
      console.log(`   ⊘ Not scored — crashed on vulnerable.js: ${vulnCrash}`);
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        crashed: { on: 'vulnerable', message: vulnCrash },
      };
      continue;
    }
    const vulnerableViolations = extractViolations(vulnerableRaw);
    const vulnerableByFunction = mapViolationsToFunctions(
      vulnerableViolations,
      vulnerableCode,
    );

    // Run on safe code
    console.log('   Scanning safe-patterns.js...');
    const safeRaw = await runEslint(
      plugin.config,
      FIXTURE_FILES.safe,
      plugin.name,
    );
    if (safeRaw === UNSUPPORTED) {
      const range = peerEslintRange(plugin.name);
      console.log(
        `   ⊘ Skipped — declares eslint "${range}", running ${ESLint.version}.`,
      );
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        unsupported: { declaredEslint: range, runningEslint: ESLint.version },
      };
      continue;
    }
    const safeCrash = crashMessage(safeRaw);
    if (safeCrash !== null) {
      console.log(`   ⊘ Not scored — crashed on safe-patterns.js: ${safeCrash}`);
      results.plugins[plugin.name] = {
        displayName: plugin.displayName,
        crashed: { on: 'safe', message: safeCrash },
      };
      continue;
    }
    const safeViolations = extractViolations(safeRaw);
    const safeByFunction = mapViolationsToFunctions(safeViolations, safeCode);

    // Calculate metrics
    const metrics = calculateMetrics(vulnerableByFunction, safeByFunction);

    console.log(`\n   📊 Results:`);
    console.log(
      `      True Positives (detected vulnerabilities): ${metrics.TP}/${TOTAL_EXPECTED_VULNERABILITIES}`,
    );
    console.log(
      `      False Negatives (missed vulnerabilities): ${metrics.FN}`,
    );
    console.log(
      `      False Positives (incorrectly flagged safe code): ${metrics.FP}`,
    );
    console.log(
      `      True Negatives (correctly ignored safe code): ${metrics.TN}/${TOTAL_SAFE_PATTERNS}`,
    );
    console.log(`\n   📈 Metrics:`);
    console.log(`      False Negative Rate: ${metrics.FNR}`);
    console.log(`      False Positive Rate: ${metrics.FPR}`);
    console.log(`      Precision: ${metrics.precision}`);
    console.log(`      Recall: ${metrics.recall}`);
    console.log(`      F1 Score: ${metrics.f1Score}`);

    // Build per-category breakdown for this plugin
    const categoryBreakdown = {};
    for (const cat of categories) {
      const expectedInCat = Object.keys(EXPECTED_DETECTIONS).filter(
        (fn) => getVulnerabilityCategory(fn) === cat,
      );
      const detectedInCat = metrics.detectedVulnerabilities.filter(
        (fn) => getVulnerabilityCategory(fn) === cat,
      );
      if (expectedInCat.length > 0) {
        categoryBreakdown[cat] = {
          expected: expectedInCat.length,
          detected: detectedInCat.length,
          missed: expectedInCat.filter((fn) => !detectedInCat.includes(fn)),
        };
      }
    }

    // Collect example violations with code snippets (top 5 most interesting)
    const exampleViolations = vulnerableViolations.slice(0, 10).map((v) => ({
      ruleId: v.ruleId,
      message: v.message,
      line: v.line,
      severity: v.severity,
      codeSnippet: getCodeSnippet(vulnerableCode, v.line),
    }));

    // Collect example false positives with code snippets
    const exampleFalsePositives = safeViolations.slice(0, 5).map((v) => ({
      ruleId: v.ruleId,
      message: v.message,
      line: v.line,
      severity: v.severity,
      codeSnippet: getCodeSnippet(safeCode, v.line),
    }));

    results.plugins[plugin.name] = {
      displayName: plugin.displayName,
      installedVersion: installedVersions[plugin.name],
      rules: plugin.rules,
      lastUpdated: plugin.lastUpdated,
      weeklyDownloads: plugin.weeklyDownloads,
      category: plugin.category,
      securityRelevant: plugin.securityRelevant !== false,
      vulnerableAnalysis: {
        totalViolations: vulnerableViolations.length,
        uniqueRulesFired: Object.keys(groupByRule(vulnerableViolations)).length,
        byFunction: vulnerableByFunction,
        byRule: groupByRule(vulnerableViolations),
        exampleViolations,
      },
      safeAnalysis: {
        totalViolations: safeViolations.length,
        uniqueRulesFired: Object.keys(groupByRule(safeViolations)).length,
        byFunction: safeByFunction,
        byRule: groupByRule(safeViolations),
        exampleFalsePositives,
      },
      categoryBreakdown,
      metrics,
    };
  }

  // Generate comparison summary
  console.log('\n\n' + '='.repeat(90));
  console.log('📋 ECOSYSTEM COMPARISON SUMMARY');
  console.log('='.repeat(90));

  console.log(
    '\n| Plugin                          | Version | Rules | Category           | TP  | FP | FN | Precision | Recall | F1     |',
  );
  console.log(
    '|:--------------------------------|:--------|:------|:-------------------|:----|:---|:---|:----------|:-------|:-------|',
  );

  /*
   * Only scored records reach the table and the leaderboard. A plugin that was
   * excluded (peer declares no support for this ESLint) or is unmeasurable
   * (needs a TypeScript program this corpus lacks) carries no `metrics`, and
   * every consumer below dereferences them. They are reported after the table
   * instead — absent from the ranking, but never invisible.
   */
  const scored = Object.entries(results.plugins).filter(
    ([, d]) => d.metrics !== undefined,
  );
  const notScored = Object.entries(results.plugins).filter(
    ([, d]) => d.metrics === undefined,
  );

  // Sort by F1 score descending
  const sortedPlugins = scored.sort(
    ([, a], [, b]) =>
      parseFloat(b.metrics.f1Score) - parseFloat(a.metrics.f1Score),
  );

  for (const [name, data] of sortedPlugins) {
    const displayName = data.displayName.substring(0, 31).padEnd(31);
    const version = (data.installedVersion || '?').padEnd(7);
    const rules = String(data.rules).padEnd(5);
    const category = data.category.substring(0, 18).padEnd(18);
    const tp = String(data.metrics.TP).padEnd(3);
    const fp = String(data.metrics.FP).padEnd(2);
    const fn = String(data.metrics.FN).padEnd(2);

    console.log(
      `| ${displayName} | ${version} | ${rules} | ${category} | ${tp} | ${fp} | ${fn} | ${data.metrics.precision.padEnd(9)} | ${data.metrics.recall.padEnd(6)} | ${data.metrics.f1Score.padEnd(6)} |`,
    );
  }

  // Excluded plugins are named, never silently dropped from the comparison.
  if (notScored.length > 0) {
    console.log('\nNot scored:');
    for (const [, d] of notScored) {
      // Three distinct reasons, and they must not borrow each other's
      // wording. A crash reported as "declares eslint undefined, ran
      // undefined" reads as a support-policy exclusion, which is somebody
      // saying they do not run here — the opposite of what happened.
      const why = d.unmeasurable
        ? d.unmeasurable
        : d.crashed
          ? `crashed on ${d.crashed.on}.js — ${d.crashed.message}`
          : `declares eslint "${d.unsupported?.declaredEslint}", ran ${d.unsupported?.runningEslint}`;
      console.log(`  ⊘ ${d.displayName} — ${why}`);
    }
  }

  // Build article-ready summary
  results.summary = {
    // Counts the plugins that produced metrics, not the ones we attempted —
    // `pluginsToTest.length` counted excluded plugins as tested.
    totalPluginsTested: sortedPlugins.length,
    notScored: notScored.map(([name, d]) => ({
      plugin: name,
      displayName: d.displayName,
      reason:
        d.unmeasurable ??
        (d.crashed
          ? `crashed at runtime on ${d.crashed.on}.js`
          : 'unsupported on this ESLint'),
      ...(d.crashed ? { crashed: d.crashed } : {}),
      declaredEslint: d.unsupported?.declaredEslint,
      runningEslint: d.unsupported?.runningEslint,
    })),
    securityRelevantPlugins: pluginsToTest.filter(
      (p) => p.securityRelevant !== false,
    ).length,
    leaderboard: sortedPlugins.map(([name, data], idx) => ({
      rank: idx + 1,
      name: data.displayName,
      version: data.installedVersion,
      f1Score: data.metrics.f1Score,
      precision: data.metrics.precision,
      recall: data.metrics.recall,
      tp: data.metrics.TP,
      fp: data.metrics.FP,
      fn: data.metrics.FN,
    })),
    topDetector: sortedPlugins[0]?.[1]?.displayName,
    topF1: sortedPlugins[0]?.[1]?.metrics.f1Score,
  };

  // Save results
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(
    OUTPUT_DIR,
    `${new Date().toISOString().split('T')[0]}.json`,
  );
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log(`\n\n✅ Results saved to: ${outputPath}`);
  console.log(
    `\n📊 Environment: Node.js ${nodeVersion} | ESLint ${eslintVersion} | ${process.platform}/${process.arch}`,
  );

  return results;
}

function groupByRule(violations) {
  const byRule = {};
  for (const v of violations) {
    if (!byRule[v.ruleId]) {
      byRule[v.ruleId] = 0;
    }
    byRule[v.ruleId]++;
  }
  return byRule;
}

// Run if called directly
/*
 * `.catch(console.error)` printed the error and exited 0 — the benchmark
 * reported success on every failure, including a TypeError in the summary
 * that skipped saving results entirely. A bench that cannot fail cannot gate.
 */
runBenchmark().catch((e) => {
  console.error(e);
  process.exit(1);
});
