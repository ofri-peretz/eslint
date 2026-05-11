/**
 * AI Security Benchmark Runner
 *
 * Generates code using LLM APIs, analyzes with ESLint security plugins,
 * and reports vulnerability rates across models.
 *
 * Usage:
 *   node benchmarks/ai-security/run.js
 *   node benchmarks/ai-security/run.js --model=claude-sonnet-4.5
 *   node benchmarks/ai-security/run.js --iterations=10
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PROMPTS,
  MODELS,
  RULE_CATEGORY_MAP,
  RULE_METADATA,
  DEFAULT_CONFIG,
} from "./prompts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "../../results/ilb-ai");
const GENERATED_DIR = path.join(__dirname, "generated");

// Ensure directories exist
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
if (!fs.existsSync(GENERATED_DIR))
  fs.mkdirSync(GENERATED_DIR, { recursive: true });

/**
 * Statistical Functions for Benchmark Analysis
 */

/**
 * Wilson Score Interval for proportions (better than normal approximation for small n)
 * @param {number} successes - Number of successes (e.g., vulnerable functions)
 * @param {number} n - Total trials (e.g., total functions)
 * @param {number} z - Z-score for confidence level (1.96 for 95%)
 * @returns {object} - { lower, upper, point } as percentages
 */
function wilsonScoreInterval(successes, n, z = 1.96) {
  if (n === 0) return { lower: 0, upper: 0, point: 0 };
  const p = successes / n;
  const denominator = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denominator;
  const margin =
    (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denominator;
  return {
    lower: Math.max(0, (center - margin) * 100),
    upper: Math.min(100, (center + margin) * 100),
    point: p * 100,
  };
}

/**
 * Chi-squared test for independence between models
 * @param {object} modelData - { modelName: { successes, total }, ... }
 * @returns {object} - { chiSquared, df, pValue, significant }
 */
function chiSquaredTest(modelData) {
  const models = Object.keys(modelData);
  if (models.length < 2)
    return { chiSquared: 0, df: 0, pValue: 1, significant: false };

  const totalSuccesses = models.reduce((s, m) => s + modelData[m].successes, 0);
  const totalFailures = models.reduce(
    (s, m) => s + (modelData[m].total - modelData[m].successes),
    0,
  );
  const grandTotal = totalSuccesses + totalFailures;

  let chiSq = 0;
  models.forEach((m) => {
    const observed = [
      modelData[m].successes,
      modelData[m].total - modelData[m].successes,
    ];
    const expected = [
      (modelData[m].total * totalSuccesses) / grandTotal,
      (modelData[m].total * totalFailures) / grandTotal,
    ];
    chiSq += observed.reduce(
      (s, o, i) => s + Math.pow(o - expected[i], 2) / expected[i],
      0,
    );
  });

  const df = models.length - 1;
  // Critical values: df=1: 3.841, df=2: 5.991, df=3: 7.815 (p=0.05)
  const criticalValues = { 1: 3.841, 2: 5.991, 3: 7.815 };
  const significant = chiSq > (criticalValues[df] || 5.991);

  return {
    chiSquared: Math.round(chiSq * 1000) / 1000,
    df,
    pValue: significant ? "< 0.05" : "> 0.05",
    significant,
  };
}

/**
 * Generate code using Claude CLI (true zero-context via --no-session-persistence)
 */
async function generateWithClaude(prompt, model) {
  const { spawnSync } = await import("child_process");

  const fullPrompt = `${prompt}\n\nProvide only the JavaScript code, no explanations.`;

  try {
    // Use spawnSync with stdin to avoid shell escaping issues
    const result = spawnSync(
      "claude",
      [
        "--print",
        "--no-session-persistence",
        "--model",
        model,
        "-", // Read prompt from stdin
      ],
      {
        input: fullPrompt,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || "Claude CLI failed");
    }

    return extractCode(result.stdout);
  } catch (error) {
    throw new Error(`Claude CLI error: ${error.message}`);
  }
}

/**
 * Ask Claude to fix code based on ESLint errors (remediation phase)
 * This tests how effective static analysis feedback is at guiding the model
 */
async function remediateWithClaude(originalCode, violations, model) {
  const { spawnSync } = await import("child_process");

  // Format the ESLint errors for the model
  const errorList = violations
    .map((v) => `Line ${v.line}: ${v.ruleId} - ${v.message}`)
    .join("\n");

  const remediationPrompt = `The following JavaScript code has security vulnerabilities detected by ESLint:

\`\`\`javascript
${originalCode}
\`\`\`

ESLint found these issues:
${errorList}

Please fix ALL the security issues and provide only the corrected JavaScript code, no explanations.`;

  try {
    // Use spawnSync with stdin to avoid shell escaping issues
    const result = spawnSync(
      "claude",
      [
        "--print",
        "--no-session-persistence",
        "--model",
        model,
        "-", // Read prompt from stdin
      ],
      {
        input: remediationPrompt,
        encoding: "utf-8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120000,
      },
    );

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || "Claude CLI failed");
    }

    return extractCode(result.stdout);
  } catch (error) {
    throw new Error(`Claude CLI remediation error: ${error.message}`);
  }
}

/**
 * Generate code using Google Gemini API
 */
async function generateWithGemini(prompt, model) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\n\nProvide only the JavaScript code, no explanations.`,
              },
            ],
          },
        ],
      }),
    },
  );

  const data = await response.json();
  return extractCode(data.candidates?.[0]?.content?.parts?.[0]?.text || "");
}

/**
 * Generate code using Gemini CLI in non-interactive mode.
 * Achieves zero-context isolation by running from an empty temp directory,
 * preventing Gemini from scanning project files.
 */
async function generateWithGeminiCLI(prompt, model) {
  const { spawnSync } = await import("child_process");
  const os = await import("os");

  const fullPrompt = `${prompt}\n\nProvide only the JavaScript code, no explanations.`;

  // Create an empty temp directory for zero-context isolation
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-bench-"));

  try {
    const result = spawnSync("gemini", ["-p", fullPrompt, "-m", model], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000,
      cwd: tempDir, // Run from empty dir = zero context
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || "Gemini CLI failed");
    }

    return extractCode(result.stdout);
  } catch (error) {
    throw new Error(`Gemini CLI error: ${error.message}`);
  } finally {
    // Cleanup temp dir
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Ask Gemini CLI to fix code based on ESLint errors (remediation phase)
 */
async function remediateWithGeminiCLI(originalCode, violations, model) {
  const { spawnSync } = await import("child_process");
  const os = await import("os");

  const errorList = violations
    .map((v) => `Line ${v.line}: ${v.ruleId} - ${v.message}`)
    .join("\n");

  const remediationPrompt = `The following JavaScript code has security vulnerabilities detected by ESLint:

\`\`\`javascript
${originalCode}
\`\`\`

ESLint found these issues:
${errorList}

Please fix ALL the security issues and provide only the corrected JavaScript code, no explanations.`;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gemini-bench-"));

  try {
    const result = spawnSync("gemini", ["-p", remediationPrompt, "-m", model], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000,
      cwd: tempDir,
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr || "Gemini CLI failed");
    }

    return extractCode(result.stdout);
  } catch (error) {
    throw new Error(`Gemini CLI remediation error: ${error.message}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Extract code from markdown code blocks
 */
function extractCode(text) {
  // Try to extract from code blocks
  const codeBlockMatch = text.match(/```(?:javascript|js)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  // Otherwise return the whole text, cleaned up
  return text.trim();
}

/**
 * Run ESLint on generated code and collect violations with full metadata
 */
async function analyzeWithESLint(code, filename) {
  const { ESLint } = await import("eslint");

  // Write code to temp file
  const tempFile = path.join(GENERATED_DIR, filename);
  fs.writeFileSync(tempFile, code);

  const eslint = new ESLint({
    overrideConfigFile: path.join(__dirname, "eslint.config.js"),
  });

  const codeLines = code.split("\n");

  try {
    const results = await eslint.lintFiles([tempFile]);
    const violations = [];

    for (const result of results) {
      for (const message of result.messages) {
        const metadata = RULE_METADATA[message.ruleId] || {};
        const category =
          metadata.category || RULE_CATEGORY_MAP[message.ruleId] || "other";

        // Extract the source line for context
        const sourceLine =
          message.line > 0 && message.line <= codeLines.length
            ? codeLines[message.line - 1]
            : null;

        violations.push({
          // ESLint core info
          ruleId: message.ruleId,
          severity: message.severity === 2 ? "error" : "warning",
          message: message.message,
          line: message.line,
          column: message.column,
          endLine: message.endLine,
          endColumn: message.endColumn,

          // Source context
          sourceLine: sourceLine?.trim(),

          // Security classification (the interesting data!)
          category,
          cwe: metadata.cwe || null,
          cweName: metadata.cweName || null,
          cvss: metadata.cvss || null,
          cvssLevel: metadata.severity || null,
          owasp: metadata.owasp || null,
          ruleDescription: metadata.description || null,
        });
      }
    }

    return violations;
  } finally {
    // Cleanup temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

/**
 * Generate code with the appropriate provider
 */
async function generateCode(prompt, modelConfig) {
  switch (modelConfig.provider) {
    case "anthropic":
      return generateWithClaude(prompt, modelConfig.model);
    case "google":
      return generateWithGemini(prompt, modelConfig.model);
    case "gemini-cli":
      return generateWithGeminiCLI(prompt, modelConfig.model);
    default:
      throw new Error(`Unknown provider: ${modelConfig.provider}`);
  }
}

/**
 * Run the full benchmark
 */
async function runBenchmark(config = DEFAULT_CONFIG) {
  console.log("🔬 AI Security Benchmark\n");
  console.log(`Models: ${config.models.join(", ")}`);
  console.log(`Iterations per prompt: ${config.iterationsPerPrompt}`);
  console.log(`Categories: ${config.categories.join(", ")}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    methodology: {
      isolation:
        "Zero-context generation - each prompt is independent with no session persistence",
      promptStyle:
        "Simple, real-world developer prompts with no security instructions",
      promptCount: Object.values(PROMPTS).flat().length,
      iterationsPerPrompt: config.iterationsPerPrompt,
      analysisTools: [
        "eslint-plugin-secure-coding",
        "eslint-plugin-pg",
        "eslint-plugin-node-security",
        "eslint-plugin-jwt",
      ],
      classification: "CWE, CVSS 3.1, OWASP Top 10 2021",
    },
    config,
    models: {},
  };

  for (const modelName of config.models) {
    const modelConfig = MODELS[modelName];
    if (!modelConfig) {
      console.log(`⚠️  Unknown model: ${modelName}, skipping`);
      continue;
    }

    console.log(`\n📊 Testing ${modelName}...`);

    const modelResults = {
      totalFunctions: 0,
      functionsWithVulnerabilities: 0,
      totalVulnerabilities: 0,
      errors: 0,
      warnings: 0,
      // Rich aggregations for benchmark insights
      byCategory: {},
      byCWE: {},
      byOWASP: {},
      bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
      byRule: {},
      // Unique findings for summary
      uniqueCWEs: new Set(),
      uniqueRules: new Set(),
      // CVSS risk scoring
      totalCVSS: 0,
      cvssCount: 0,
      // Per-prompt detailed results
      byPrompt: [],
    };

    for (const category of config.categories) {
      const prompts = PROMPTS[category];
      if (!prompts) continue;

      for (const promptConfig of prompts) {
        const promptResults = {
          id: promptConfig.id,
          prompt: promptConfig.prompt,
          iterations: [],
        };

        for (let i = 0; i < config.iterationsPerPrompt; i++) {
          try {
            const code = await generateCode(promptConfig.prompt, modelConfig);
            const violations = await analyzeWithESLint(
              code,
              `${modelName}-${promptConfig.id}-${i}.js`,
            );

            modelResults.totalFunctions++;

            if (violations.length > 0) {
              modelResults.functionsWithVulnerabilities++;
              modelResults.totalVulnerabilities += violations.length;

              for (const v of violations) {
                // Category aggregation
                modelResults.byCategory[v.category] =
                  (modelResults.byCategory[v.category] || 0) + 1;

                // CWE aggregation (key insight for security teams)
                if (v.cwe) {
                  modelResults.byCWE[v.cwe] = modelResults.byCWE[v.cwe] || {
                    count: 0,
                    name: v.cweName,
                  };
                  modelResults.byCWE[v.cwe].count++;
                  modelResults.uniqueCWEs.add(v.cwe);
                }

                // OWASP aggregation (key for compliance)
                if (v.owasp) {
                  modelResults.byOWASP[v.owasp] =
                    (modelResults.byOWASP[v.owasp] || 0) + 1;
                }

                // Severity aggregation
                if (v.cvssLevel) {
                  const level = v.cvssLevel.toLowerCase();
                  if (modelResults.bySeverity[level] !== undefined) {
                    modelResults.bySeverity[level]++;
                  }
                }

                // Error vs warning count
                if (v.severity === "error") {
                  modelResults.errors++;
                } else {
                  modelResults.warnings++;
                }

                // Rule aggregation (which rules fire most often)
                if (v.ruleId) {
                  modelResults.byRule[v.ruleId] = modelResults.byRule[
                    v.ruleId
                  ] || {
                    count: 0,
                    cwe: v.cwe,
                    cvss: v.cvss,
                    severity: v.cvssLevel,
                  };
                  modelResults.byRule[v.ruleId].count++;
                  modelResults.uniqueRules.add(v.ruleId);
                }

                // CVSS score aggregation for average risk
                if (v.cvss) {
                  modelResults.totalCVSS += v.cvss;
                  modelResults.cvssCount++;
                }
              }
            }

            promptResults.iterations.push({
              iteration: i + 1,
              hasVulnerabilities: violations.length > 0,
              vulnerabilityCount: violations.length,
              violations,
              code,
            });

            process.stdout.write(violations.length > 0 ? "❌" : "✅");

            // REMEDIATION PHASE: If vulnerabilities found, ask model to fix them
            if (violations.length > 0) {
              try {
                let fixedCode;
                if (modelConfig.provider === "anthropic") {
                  fixedCode = await remediateWithClaude(
                    code,
                    violations,
                    modelConfig.model,
                  );
                } else if (modelConfig.provider === "gemini-cli") {
                  fixedCode = await remediateWithGeminiCLI(
                    code,
                    violations,
                    modelConfig.model,
                  );
                } else {
                  // Skip remediation for raw API providers (no CLI to call)
                  throw new Error(
                    "Remediation not supported for this provider",
                  );
                }
                const fixedViolations = await analyzeWithESLint(
                  fixedCode,
                  `${modelName}-${promptConfig.id}-${i}-fixed.js`,
                );

                const originalCount = violations.length;
                const fixedCount = fixedViolations.length;
                const fixedAll = fixedCount === 0;
                const fixRate =
                  originalCount > 0
                    ? Math.round(
                        ((originalCount - fixedCount) / originalCount) * 100,
                      )
                    : 100;

                // Track remediation stats
                modelResults.remediationAttempts =
                  (modelResults.remediationAttempts || 0) + 1;
                modelResults.remediationFullyFixed =
                  (modelResults.remediationFullyFixed || 0) +
                  (fixedAll ? 1 : 0);
                modelResults.remediationTotalOriginal =
                  (modelResults.remediationTotalOriginal || 0) + originalCount;
                modelResults.remediationTotalRemaining =
                  (modelResults.remediationTotalRemaining || 0) + fixedCount;

                // Store remediation results
                promptResults.iterations[
                  promptResults.iterations.length - 1
                ].remediation = {
                  fixedCode,
                  originalVulnerabilityCount: originalCount,
                  remainingVulnerabilityCount: fixedCount,
                  fixedAllVulnerabilities: fixedAll,
                  fixRate: `${fixRate}%`,
                  remainingViolations: fixedViolations,
                };

                process.stdout.write(fixedAll ? "→✅" : `→${fixedCount}`);
              } catch (remediationError) {
                promptResults.iterations[
                  promptResults.iterations.length - 1
                ].remediation = {
                  error: remediationError.message,
                };
                process.stdout.write("→⚠️");
              }
            }
          } catch (error) {
            console.error(`\n⚠️  Error: ${error.message}`);
            promptResults.iterations.push({
              iteration: i + 1,
              error: error.message,
            });
            process.stdout.write("⚠️");
          }

          // Rate limiting
          await new Promise((r) => setTimeout(r, 500));
        }

        modelResults.byPrompt.push(promptResults);
      }
    }

    // Calculate vulnerability rate
    const vulnRate =
      modelResults.totalFunctions > 0
        ? (modelResults.functionsWithVulnerabilities /
            modelResults.totalFunctions) *
          100
        : 0;
    modelResults.vulnerabilityRate = `${Math.round(vulnRate)}%`;
    modelResults.vulnerabilityRateNumeric = Math.round(vulnRate);

    // Calculate average CVSS score (risk quantification)
    modelResults.averageCVSS =
      modelResults.cvssCount > 0
        ? Math.round((modelResults.totalCVSS / modelResults.cvssCount) * 10) /
          10
        : null;

    // Calculate remediation effectiveness (static analysis as Guardian Layer)
    if (modelResults.remediationAttempts > 0) {
      const fixRate =
        modelResults.remediationTotalOriginal > 0
          ? Math.round(
              ((modelResults.remediationTotalOriginal -
                modelResults.remediationTotalRemaining) /
                modelResults.remediationTotalOriginal) *
                100,
            )
          : 0;
      modelResults.remediationEffectiveness = {
        attempts: modelResults.remediationAttempts,
        fullyFixed: modelResults.remediationFullyFixed,
        fullyFixedRate: `${Math.round((modelResults.remediationFullyFixed / modelResults.remediationAttempts) * 100)}%`,
        totalOriginalVulnerabilities: modelResults.remediationTotalOriginal,
        totalRemainingVulnerabilities: modelResults.remediationTotalRemaining,
        overallFixRate: `${fixRate}%`,
      };
    }

    // Convert Sets to arrays for JSON serialization
    modelResults.uniqueCWEs = Array.from(modelResults.uniqueCWEs);
    modelResults.uniqueRules = Array.from(modelResults.uniqueRules);

    // Clean up temporary fields
    delete modelResults.totalCVSS;
    delete modelResults.cvssCount;
    delete modelResults.remediationAttempts;
    delete modelResults.remediationFullyFixed;
    delete modelResults.remediationTotalOriginal;
    delete modelResults.remediationTotalRemaining;

    results.models[modelName] = modelResults;

    console.log(`\n\n📈 ${modelName} Results:`);
    console.log(`   Total functions: ${modelResults.totalFunctions}`);
    console.log(
      `   With vulnerabilities: ${modelResults.functionsWithVulnerabilities}`,
    );
    console.log(`   Vulnerability rate: ${modelResults.vulnerabilityRate}`);
    console.log(`   Average CVSS: ${modelResults.averageCVSS || "N/A"}`);
    console.log(`   Unique CWEs: ${modelResults.uniqueCWEs.length}`);
    console.log(`   By category:`, modelResults.byCategory);
    if (modelResults.remediationEffectiveness) {
      console.log(`   🔧 REMEDIATION (Static Analysis Effectiveness):`);
      console.log(
        `      Fully fixed: ${modelResults.remediationEffectiveness.fullyFixed}/${modelResults.remediationEffectiveness.attempts} (${modelResults.remediationEffectiveness.fullyFixedRate})`,
      );
      console.log(
        `      Overall fix rate: ${modelResults.remediationEffectiveness.overallFixRate}`,
      );
    }
  }

  // Generate cross-model insights for the benchmark summary
  const modelNames = Object.keys(results.models);
  const allVulnRates = modelNames.map(
    (m) => results.models[m].vulnerabilityRateNumeric,
  );
  const allCVSS = modelNames
    .map((m) => results.models[m].averageCVSS)
    .filter(Boolean);

  // Calculate statistical analysis per model
  const statisticalAnalysis = {
    vulnerabilityRates: {},
    remediationRates: {},
    modelComparison: null,
  };

  // Build data for chi-squared test
  const vulnTestData = {};
  const remediationTestData = {};

  modelNames.forEach((m) => {
    const model = results.models[m];
    const vulnerable = model.functionsWithVulnerabilities;
    const total = model.totalFunctions;

    // Vulnerability rate CI
    const vulnCI = wilsonScoreInterval(vulnerable, total);
    statisticalAnalysis.vulnerabilityRates[m] = {
      rate: `${vulnCI.point.toFixed(1)}%`,
      ci95: `[${vulnCI.lower.toFixed(1)}% - ${vulnCI.upper.toFixed(1)}%]`,
      n: total,
    };
    vulnTestData[m] = { successes: vulnerable, total };

    // Remediation rate CI (if available)
    if (model.remediationEffectiveness) {
      const fixed = model.remediationEffectiveness.fullyFixed;
      const attempts = model.remediationEffectiveness.attempts;
      const remCI = wilsonScoreInterval(fixed, attempts);
      statisticalAnalysis.remediationRates[m] = {
        rate: `${remCI.point.toFixed(1)}%`,
        ci95: `[${remCI.lower.toFixed(1)}% - ${remCI.upper.toFixed(1)}%]`,
        n: attempts,
      };
      remediationTestData[m] = { successes: fixed, total: attempts };
    }
  });

  // Chi-squared test for model comparison
  if (modelNames.length >= 2) {
    statisticalAnalysis.modelComparison = chiSquaredTest(vulnTestData);
  }

  results.summary = {
    totalModels: modelNames.length,
    totalFunctions: Object.values(results.models).reduce(
      (sum, m) => sum + m.totalFunctions,
      0,
    ),
    totalVulnerabilities: Object.values(results.models).reduce(
      (sum, m) => sum + m.totalVulnerabilities,
      0,
    ),
    averageVulnerabilityRate: `${Math.round(allVulnRates.reduce((a, b) => a + b, 0) / allVulnRates.length)}%`,
    vulnerabilityRateRange: `${Math.min(...allVulnRates)}-${Math.max(...allVulnRates)}%`,
    averageCVSS:
      allCVSS.length > 0
        ? Math.round(
            (allCVSS.reduce((a, b) => a + b, 0) / allCVSS.length) * 10,
          ) / 10
        : null,
    // Collect unique CWEs across all models
    allUniqueCWEs: [
      ...new Set(modelNames.flatMap((m) => results.models[m].uniqueCWEs)),
    ],
    // Top categories across all models
    topCategories: Object.entries(
      modelNames.reduce((acc, m) => {
        for (const [cat, count] of Object.entries(
          results.models[m].byCategory,
        )) {
          acc[cat] = (acc[cat] || 0) + count;
        }
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    // Statistical analysis
    statistics: statisticalAnalysis,
  };

  // Save results (with full detail)
  const filename = `${new Date().toISOString().split("T")[0]}.json`;
  const resultsPath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Results saved to: ${resultsPath}`);

  return results;
}

/**
 * Print rich summary table
 */
function printSummary(results) {
  console.log("\n" + "═".repeat(80));
  console.log("AI SECURITY BENCHMARK RESULTS");
  console.log("═".repeat(80));

  // Cross-model summary
  if (results.summary) {
    console.log("\n📊 OVERALL FINDINGS:");
    console.log(
      `   Total functions analyzed: ${results.summary.totalFunctions}`,
    );
    console.log(
      `   Total vulnerabilities found: ${results.summary.totalVulnerabilities}`,
    );
    console.log(
      `   Average vulnerability rate: ${results.summary.averageVulnerabilityRate}`,
    );
    console.log(
      `   Vulnerability rate range: ${results.summary.vulnerabilityRateRange}`,
    );
    if (results.summary.averageCVSS) {
      console.log(`   Average CVSS score: ${results.summary.averageCVSS}/10`);
    }
    console.log(
      `   Unique CWEs detected: ${results.summary.allUniqueCWEs?.length || 0}`,
    );
  }

  // Model comparison table
  console.log("\n📈 MODEL COMPARISON:");
  console.log(
    "| Model | Functions | Vulnerable | Rate | Avg CVSS | Unique CWEs |",
  );
  console.log(
    "|-------|-----------|------------|------|----------|-------------|",
  );

  for (const [model, data] of Object.entries(results.models)) {
    console.log(
      `| ${model.padEnd(15)} | ${String(data.totalFunctions).padStart(9)} | ${String(data.functionsWithVulnerabilities).padStart(10)} | ${data.vulnerabilityRate.padStart(4)} | ${String(data.averageCVSS || "N/A").padStart(8)} | ${String(data.uniqueCWEs?.length || 0).padStart(11)} |`,
    );
  }

  // Top vulnerability categories
  if (results.summary?.topCategories?.length > 0) {
    console.log("\n🔥 TOP VULNERABILITY CATEGORIES:");
    for (const [category, count] of results.summary.topCategories) {
      console.log(`   ${category}: ${count} occurrences`);
    }
  }

  // CWE breakdown
  if (results.summary?.allUniqueCWEs?.length > 0) {
    console.log("\n🛡️  CWEs DETECTED:");
    console.log(`   ${results.summary.allUniqueCWEs.join(", ")}`);
  }

  console.log("\n" + "═".repeat(80));
}

// CLI
const args = process.argv.slice(2);
const modelArg = args.find((a) => a.startsWith("--model="))?.split("=")[1];
const iterationsArg = parseInt(
  args.find((a) => a.startsWith("--iterations="))?.split("=")[1] ||
    DEFAULT_CONFIG.iterationsPerPrompt,
);

const config = {
  ...DEFAULT_CONFIG,
  iterationsPerPrompt: iterationsArg,
};

if (modelArg) {
  config.models = [modelArg];
}

runBenchmark(config).then(printSummary).catch(console.error);
