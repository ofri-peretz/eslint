#!/usr/bin/env node

/**
 * Quality FN/FP Benchmark Runner — Code Quality Plugin Comparison
 *
 * Separate from the security benchmark. Tests quality/maintainability
 * patterns instead of security vulnerabilities.
 *
 * Competitors:
 *   1. eslint-plugin-sonarjs        — SonarSource (269 rules)
 *   2. eslint-plugin-unicorn        — Best practices (144 rules)
 *   3. eslint-plugin-import         — Module resolution (44 rules)
 *   4. eslint-plugin-promise        — Promise patterns (13 rules)
 *   5. eslint-plugin-jsdoc          — Documentation (51 rules)
 *   6. eslint-plugin-n              — Node.js (41 rules)
 *   7. eslint-plugin-regexp         — RegExp quality (78 rules)
 *   8. Interlace Quality Fleet      — 7 quality plugins (~100 rules)
 *
 * Usage:
 *   node benchmarks/quality-comparison/run.js
 *   node benchmarks/quality-comparison/run.js --plugin=sonarjs
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { ESLint } from "eslint";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

import {
  EXPECTED_DETECTIONS,
  TOTAL_EXPECTED_PROBLEMS,
} from "./fixtures/problematic/quality-antipatterns.js";
import {
  EXPECTED_NO_DETECTIONS,
  TOTAL_CLEAN_PATTERNS,
} from "./fixtures/clean/clean-patterns.js";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ALL_PLUGINS = [
  {
    name: "sonarjs",
    displayName: "eslint-plugin-sonarjs (SonarSource)",
    config: "./configs/sonarjs.config.js",
    rules: 269,
    weeklyDownloads: "3M+",
    category: "Quality + Security",
  },
  {
    name: "unicorn",
    displayName: "eslint-plugin-unicorn",
    config: "./configs/unicorn.config.js",
    rules: 144,
    weeklyDownloads: "5M+",
    category: "Best Practices",
  },
  {
    name: "import",
    displayName: "eslint-plugin-import",
    config: "./configs/import.config.js",
    rules: 44,
    weeklyDownloads: "40M+",
    category: "Module Resolution",
  },
  {
    name: "promise",
    displayName: "eslint-plugin-promise",
    config: "./configs/promise.config.js",
    rules: 13,
    weeklyDownloads: "10M+",
    category: "Promises",
  },
  {
    name: "jsdoc",
    displayName: "eslint-plugin-jsdoc",
    config: "./configs/jsdoc.config.js",
    rules: 51,
    weeklyDownloads: "3.8M+",
    category: "Documentation",
  },
  {
    name: "eslint-plugin-n",
    displayName: "eslint-plugin-n",
    config: "./configs/eslint-plugin-n.config.js",
    rules: 41,
    weeklyDownloads: "8M+",
    category: "Node.js",
  },
  {
    name: "regexp",
    displayName: "eslint-plugin-regexp",
    config: "./configs/regexp.config.js",
    rules: 78,
    weeklyDownloads: "5M+",
    category: "RegExp",
  },
  {
    name: "interlace-quality",
    displayName: "Interlace Quality Fleet",
    config: "./configs/interlace-quality.config.js",
    rules: 120, // maintainability(16)+reliability(18)+operability(12)+conventions(10)+modularity(5)+modernization(3)+import-next(56)
    weeklyDownloads: "~5K",
    category: "Quality (Full Stack)",
  },
];

const FIXTURE_FILES = {
  problematic: path.join(
    __dirname,
    "fixtures/problematic/quality-antipatterns.js",
  ),
  clean: path.join(__dirname, "fixtures/clean/clean-patterns.js"),
};

const OUTPUT_DIR = path.join(__dirname, "../../results/ilb-arena-quality");

// =============================================================================
// CLI
// =============================================================================

function getPluginsToTest() {
  const args = process.argv.slice(2);
  const pluginArg = args.find((a) => a.startsWith("--plugin="));
  if (pluginArg) {
    const name = pluginArg.split("=")[1];
    const plugin = ALL_PLUGINS.find((p) => p.name === name);
    if (!plugin) {
      console.error(
        `Unknown plugin: ${name}. Available: ${ALL_PLUGINS.map((p) => p.name).join(", ")}`,
      );
      process.exit(1);
    }
    return [plugin];
  }
  return ALL_PLUGINS;
}

// =============================================================================
// RUNNER
// =============================================================================

// In-process ESLint Node API runner. tsx (registered via the npm script
// invocation `tsx benchmarks/ilb-arena-quality/run.js`) handles TS-source
// imports inside `interlace-quality.config.js`. See ilb-arena/run.js for
// the same pattern.
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

async function runEslint(configPath, targetFile) {
  const absoluteTarget = path.resolve(targetFile);
  let config;
  try {
    config = await loadConfig(configPath);
  } catch (e) {
    console.error(`  ⚠️  Config load failed for ${configPath}: ${e.message?.slice(0, 200)}`);
    return [];
  }
  try {
    const eslint = new ESLint({
      cwd: __dirname,
      overrideConfigFile: true,
      overrideConfig: config,
    });
    return await eslint.lintFiles([absoluteTarget]);
  } catch (e) {
    console.error(`  ⚠️  ESLint run failed for ${configPath}: ${e.message?.slice(0, 200)}`);
    return [];
  }
}

function extractViolations(eslintResults) {
  const violations = [];
  for (const file of eslintResults) {
    for (const message of file.messages || []) {
      if (message.ruleId === null) continue;
      violations.push({
        ruleId: message.ruleId,
        severity: message.severity === 2 ? "error" : "warning",
        message: message.message,
        line: message.line,
        column: message.column,
      });
    }
  }
  return violations;
}

function mapViolationsToFunctions(violations, sourceCode) {
  const functionViolations = {};
  const lines = sourceCode.split("\n");
  const functions = [];
  let currentFunction = null;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const funcMatch = line.match(
      /export\s+(?:async\s+)?(?:function|class)\s+(\w+)/,
    );
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
  if (currentFunction) {
    currentFunction.endLine = lines.length;
    functions.push(currentFunction);
  }

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

function groupByRule(violations) {
  const byRule = {};
  for (const v of violations) {
    if (!byRule[v.ruleId]) byRule[v.ruleId] = 0;
    byRule[v.ruleId]++;
  }
  return byRule;
}

// =============================================================================
// METRICS
// =============================================================================

function calculateMetrics(problematicResults, cleanResults) {
  const detectedProblems = Object.keys(problematicResults);
  const TP = detectedProblems.filter((fn) => fn in EXPECTED_DETECTIONS).length;
  const FN = TOTAL_EXPECTED_PROBLEMS - TP;

  const flaggedCleanPatterns = Object.keys(cleanResults);
  const FP = flaggedCleanPatterns.filter((fn) =>
    EXPECTED_NO_DETECTIONS.includes(fn),
  ).length;
  const TN = TOTAL_CLEAN_PATTERNS - FP;

  const FNR =
    TOTAL_EXPECTED_PROBLEMS > 0
      ? ((FN / TOTAL_EXPECTED_PROBLEMS) * 100).toFixed(1)
      : 0;
  const FPR =
    TOTAL_CLEAN_PATTERNS > 0
      ? ((FP / TOTAL_CLEAN_PATTERNS) * 100).toFixed(1)
      : 0;
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
    detectedProblems,
    missedProblems: Object.keys(EXPECTED_DETECTIONS).filter(
      (fn) => !detectedProblems.includes(fn),
    ),
    falsePositives: flaggedCleanPatterns,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function runBenchmark() {
  const pluginsToTest = getPluginsToTest();

  console.log("🧹 Quality FN/FP Benchmark: Code Quality Plugin Comparison\n");
  console.log("=".repeat(70));
  console.log(
    `   Testing ${pluginsToTest.length} plugin(s) against ${TOTAL_EXPECTED_PROBLEMS} problematic + ${TOTAL_CLEAN_PATTERNS} clean patterns`,
  );
  console.log("=".repeat(70));

  const problematicCode = fs.readFileSync(FIXTURE_FILES.problematic, "utf-8");
  const cleanCode = fs.readFileSync(FIXTURE_FILES.clean, "utf-8");

  // Resolve installed plugin versions
  function getInstalledVersion(pkgName) {
    try {
      const pkgEntrypoint = require.resolve(pkgName);
      let dir = path.dirname(pkgEntrypoint);
      for (let i = 0; i < 5; i++) {
        const candidate = path.join(dir, "package.json");
        if (fs.existsSync(candidate)) {
          const pkg = JSON.parse(fs.readFileSync(candidate, "utf-8"));
          if (pkg.name === pkgName) return pkg.version;
        }
        dir = path.dirname(dir);
      }
      return "unknown";
    } catch {
      return "unknown";
    }
  }

  // Extract code snippet around a violation line
  function getCodeSnippet(sourceCode, lineNum, context = 2) {
    const lines = sourceCode.split("\n");
    const start = Math.max(0, lineNum - context - 1);
    const end = Math.min(lines.length, lineNum + context);
    return lines
      .slice(start, end)
      .map((l, i) => {
        const num = start + i + 1;
        const marker = num === lineNum ? " >>>" : "    ";
        return `${marker} ${num}: ${l}`;
      })
      .join("\n");
  }

  // Classify quality problems by category
  function getQualityCategory(fnName) {
    if (
      fnName.includes("silent") ||
      fnName.includes("null") ||
      fnName.includes("timeout") ||
      fnName.includes("await_in_loop") ||
      fnName.includes("unhandled") ||
      fnName.includes("error_handling")
    )
      return "Reliability";
    if (
      fnName.includes("console") ||
      fnName.includes("debug") ||
      fnName.includes("alert") ||
      fnName.includes("todo") ||
      fnName.includes("verbose_error") ||
      fnName.includes("process_exit")
    )
      return "Operability";
    if (
      fnName.includes("deep_nesting") ||
      fnName.includes("long_function") ||
      fnName.includes("duplicated") ||
      fnName.includes("complex") ||
      fnName.includes("god_function") ||
      fnName.includes("magic")
    )
      return "Maintainability";
    if (
      fnName.includes("var_usage") ||
      fnName.includes("callback") ||
      fnName.includes("mutating") ||
      fnName.includes("inconsistent") ||
      fnName.includes("global_state") ||
      fnName.includes("string_concat")
    )
      return "Conventions";
    if (
      fnName.includes("anemic") ||
      fnName.includes("circular") ||
      fnName.includes("tight") ||
      fnName.includes("api_in_utils") ||
      fnName.includes("mutable_export")
    )
      return "Modularity";
    if (
      fnName.includes("dynamic_require") ||
      fnName.includes("barrel") ||
      fnName.includes("wildcard")
    )
      return "Import Hygiene";
    if (
      fnName.includes("old_array") ||
      fnName.includes("arguments") ||
      fnName.includes("for_in") ||
      fnName.includes("new_buffer")
    )
      return "Modernization";
    if (
      fnName.includes("promise") ||
      fnName.includes("return_await") ||
      fnName.includes("race")
    )
      return "Promise Patterns";
    return "Other";
  }

  const npmPackageNames = {
    sonarjs: "eslint-plugin-sonarjs",
    unicorn: "eslint-plugin-unicorn",
    import: "eslint-plugin-import",
    promise: "eslint-plugin-promise",
    jsdoc: "eslint-plugin-jsdoc",
    "eslint-plugin-n": "eslint-plugin-n",
    regexp: "eslint-plugin-regexp",
    "interlace-quality": "eslint-plugin-reliability",
  };

  const installedVersions = {};
  for (const plugin of pluginsToTest) {
    const pkgName = npmPackageNames[plugin.name] || plugin.name;
    installedVersions[plugin.name] = getInstalledVersion(pkgName);
  }
  // For Interlace quality fleet, resolve all sub-plugin versions
  if (installedVersions["interlace-quality"]) {
    installedVersions["interlace-quality-detail"] = {
      "eslint-plugin-maintainability": getInstalledVersion(
        "eslint-plugin-maintainability",
      ),
      "eslint-plugin-reliability": getInstalledVersion(
        "eslint-plugin-reliability",
      ),
      "eslint-plugin-operability": getInstalledVersion(
        "eslint-plugin-operability",
      ),
      "eslint-plugin-conventions": getInstalledVersion(
        "eslint-plugin-conventions",
      ),
      "eslint-plugin-modularity": getInstalledVersion(
        "eslint-plugin-modularity",
      ),
      "eslint-plugin-modernization": getInstalledVersion(
        "eslint-plugin-modernization",
      ),
      "eslint-plugin-import-next": getInstalledVersion(
        "eslint-plugin-import-next",
      ),
    };
  }

  const eslintVersion = getInstalledVersion("eslint");
  const nodeVersion = process.version;

  const qualityCategories = [
    "Reliability",
    "Operability",
    "Maintainability",
    "Conventions",
    "Modularity",
    "Import Hygiene",
    "Modernization",
    "Promise Patterns",
  ];

  const results = {
    timestamp: new Date().toISOString(),
    benchmarkType: "quality",
    environment: {
      nodeVersion,
      eslintVersion,
      platform: process.platform,
      arch: process.arch,
    },
    installedVersions,
    methodology: {
      approach: "Static fixture-based quality comparison",
      description:
        "Each plugin is run in isolation against identical fixture files containing known-problematic and known-clean code patterns. Violations are mapped to exported functions to calculate True Positives (correctly detected anti-patterns), False Negatives (missed anti-patterns), False Positives (clean code incorrectly flagged), and True Negatives (clean code correctly passed).",
      problematicPatterns: TOTAL_EXPECTED_PROBLEMS,
      cleanPatterns: TOTAL_CLEAN_PATTERNS,
      categories: qualityCategories,
      expectedDetections: EXPECTED_DETECTIONS,
      expectedNoDetections: EXPECTED_NO_DETECTIONS,
    },
    fixtures: {
      problematicFile: FIXTURE_FILES.problematic,
      cleanFile: FIXTURE_FILES.clean,
    },
    plugins: {},
    summary: {},
  };

  for (const plugin of pluginsToTest) {
    console.log(`\n\n🔍 Testing: ${plugin.displayName}`);
    console.log(
      `   Rules: ${plugin.rules} | Category: ${plugin.category} | Downloads: ${plugin.weeklyDownloads}`,
    );
    console.log("-".repeat(70));

    console.log("   Scanning quality-antipatterns.js...");
    const probRaw = await runEslint(plugin.config, FIXTURE_FILES.problematic);
    const probViolations = extractViolations(probRaw);
    const probByFunction = mapViolationsToFunctions(
      probViolations,
      problematicCode,
    );

    console.log("   Scanning clean-patterns.js...");
    const cleanRaw = await runEslint(plugin.config, FIXTURE_FILES.clean);
    const cleanViolations = extractViolations(cleanRaw);
    const cleanByFunction = mapViolationsToFunctions(
      cleanViolations,
      cleanCode,
    );

    const metrics = calculateMetrics(probByFunction, cleanByFunction);

    console.log(`\n   📊 Results:`);
    console.log(
      `      True Positives (detected issues): ${metrics.TP}/${TOTAL_EXPECTED_PROBLEMS}`,
    );
    console.log(`      False Negatives (missed issues): ${metrics.FN}`);
    console.log(`      False Positives (clean code flagged): ${metrics.FP}`);
    console.log(
      `      True Negatives (clean code passed): ${metrics.TN}/${TOTAL_CLEAN_PATTERNS}`,
    );
    console.log(`\n   📈 Metrics:`);
    console.log(`      Precision: ${metrics.precision}`);
    console.log(`      Recall: ${metrics.recall}`);
    console.log(`      F1 Score: ${metrics.f1Score}`);

    // Per-category breakdown
    const categoryBreakdown = {};
    for (const cat of qualityCategories) {
      const expectedInCat = Object.keys(EXPECTED_DETECTIONS).filter(
        (fn) => getQualityCategory(fn) === cat,
      );
      const detectedInCat = metrics.detectedProblems.filter(
        (fn) => getQualityCategory(fn) === cat,
      );
      if (expectedInCat.length > 0) {
        categoryBreakdown[cat] = {
          expected: expectedInCat.length,
          detected: detectedInCat.length,
          missed: expectedInCat.filter((fn) => !detectedInCat.includes(fn)),
        };
      }
    }

    // Example violations with code snippets
    const exampleViolations = probViolations.slice(0, 10).map((v) => ({
      ruleId: v.ruleId,
      message: v.message,
      line: v.line,
      severity: v.severity,
      codeSnippet: getCodeSnippet(problematicCode, v.line),
    }));

    // Example false positives with code snippets
    const exampleFalsePositives = cleanViolations.slice(0, 5).map((v) => ({
      ruleId: v.ruleId,
      message: v.message,
      line: v.line,
      severity: v.severity,
      codeSnippet: getCodeSnippet(cleanCode, v.line),
    }));

    results.plugins[plugin.name] = {
      displayName: plugin.displayName,
      installedVersion: installedVersions[plugin.name],
      rules: plugin.rules,
      weeklyDownloads: plugin.weeklyDownloads,
      category: plugin.category,
      problematicAnalysis: {
        totalViolations: probViolations.length,
        uniqueRulesFired: Object.keys(groupByRule(probViolations)).length,
        byFunction: probByFunction,
        byRule: groupByRule(probViolations),
        exampleViolations,
      },
      cleanAnalysis: {
        totalViolations: cleanViolations.length,
        uniqueRulesFired: Object.keys(groupByRule(cleanViolations)).length,
        byFunction: cleanByFunction,
        byRule: groupByRule(cleanViolations),
        exampleFalsePositives,
      },
      categoryBreakdown,
      metrics,
    };
  }

  // Summary table
  console.log("\n\n" + "=".repeat(100));
  console.log("📋 QUALITY ECOSYSTEM COMPARISON SUMMARY");
  console.log("=".repeat(100));

  console.log(
    "\n| Plugin                          | Version | Rules | Category           | TP  | FP | FN | Precision | Recall | F1     |",
  );
  console.log(
    "|:--------------------------------|:--------|:------|:-------------------|:----|:---|:---|:----------|:-------|:-------|",
  );

  const sortedPlugins = Object.entries(results.plugins).sort(
    ([, a], [, b]) =>
      parseFloat(b.metrics.f1Score) - parseFloat(a.metrics.f1Score),
  );

  for (const [, data] of sortedPlugins) {
    const dn = data.displayName.substring(0, 31).padEnd(31);
    const version = (data.installedVersion || "?").padEnd(7);
    const rules = String(data.rules).padEnd(5);
    const cat = data.category.substring(0, 18).padEnd(18);
    const tp = String(data.metrics.TP).padEnd(3);
    const fp = String(data.metrics.FP).padEnd(2);
    const fn = String(data.metrics.FN).padEnd(2);

    console.log(
      `| ${dn} | ${version} | ${rules} | ${cat} | ${tp} | ${fp} | ${fn} | ${data.metrics.precision.padEnd(9)} | ${data.metrics.recall.padEnd(6)} | ${data.metrics.f1Score.padEnd(6)} |`,
    );
  }

  // Build article-ready summary
  results.summary = {
    totalPluginsTested: pluginsToTest.length,
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
    `${new Date().toISOString().split("T")[0]}.json`,
  );
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n\n✅ Results saved to: ${outputPath}`);
  console.log(
    `\n📊 Environment: Node.js ${nodeVersion} | ESLint ${eslintVersion} | ${process.platform}/${process.arch}`,
  );

  return results;
}

runBenchmark().catch(console.error);
