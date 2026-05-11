#!/usr/bin/env -S npx tsx

// ILB-Juliet — CWE-mapped synthetic accuracy bench (v1.0)
//
// Walks benchmarks/corpus/CWE-NNN/{vulnerable,safe}/, lints every
// fixture with each registered plugin, scores TP / FP / FN per CWE, and
// emits per-CWE + aggregate F1 + OWASP Benchmark Accuracy Score
// (BAS = TPR − FPR). Results land at results/ilb-juliet/<date>.json.
//
// Usage (from benchmarks/ workspace):
//   npm run ilb:juliet                       # full ecosystem
//   npm run ilb:juliet -- --plugin=interlace # single
//   npm run ilb:juliet -- --cwe=CWE-089      # single CWE
//   npm run ilb:juliet -- --json             # JSON only

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { ESLint } from "eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.resolve(__dirname, "..", "..");
const CORPUS_DIR = path.join(BENCH_ROOT, "corpus");
const RESULTS_DIR = path.join(BENCH_ROOT, "results", "ilb-juliet");

// ── Plugin matrix (mirrors ILB-Arena) ─────────────────────────────────

const ALL_PLUGINS = [
  {
    name: "interlace",
    displayName: "Interlace ESLint Ecosystem",
    config: "../ilb-arena/configs/interlace.config.js",
  },
  {
    name: "eslint-plugin-security",
    displayName: "eslint-plugin-security",
    config: "../ilb-arena/configs/eslint-plugin-security.config.js",
  },
  {
    name: "security-node",
    displayName: "eslint-plugin-security-node",
    config: "../ilb-arena/configs/security-node.config.js",
  },
  {
    name: "sonarjs",
    displayName: "eslint-plugin-sonarjs",
    config: "../ilb-arena/configs/sonarjs.config.js",
  },
  {
    name: "microsoft-sdl",
    displayName: "@microsoft/eslint-plugin-sdl",
    config: "../ilb-arena/configs/microsoft-sdl.config.js",
  },
  {
    name: "no-unsanitized",
    displayName: "eslint-plugin-no-unsanitized",
    config: "../ilb-arena/configs/no-unsanitized.config.js",
  },
];

// ── CLI ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const opt = (n) => {
  const eq = args.find((a) => a.startsWith(`--${n}=`));
  if (eq) return eq.split("=").slice(1).join("=");
  const idx = args.indexOf(`--${n}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const flag = (n) => args.includes(`--${n}`);

const pluginFilter = opt("plugin");
const cweFilter = opt("cwe");
const EMIT_JSON = flag("json");

// ── Config loader (cached) ─────────────────────────────────────────────

const configCache = new Map();

async function loadConfig(configPath) {
  if (configCache.has(configPath)) return configCache.get(configPath);
  const abs = path.resolve(__dirname, configPath);
  const url = pathToFileURL(abs).href;
  const mod = await import(url);
  const config = mod.default ?? mod;
  configCache.set(configPath, config);
  return config;
}

async function lintFixture(plugin, file) {
  let config;
  try {
    config = await loadConfig(plugin.config);
  } catch (e) {
    return { error: `config-load: ${e.message?.slice(0, 200)}` };
  }
  try {
    const eslint = new ESLint({
      cwd: BENCH_ROOT,
      overrideConfigFile: true,
      overrideConfig: config,
    });
    const results = await eslint.lintFiles([file]);
    let count = 0;
    const ruleHits = {};
    for (const r of results) {
      for (const m of r.messages || []) {
        if (m.fatal) continue;
        if (!m.ruleId) continue;
        count++;
        ruleHits[m.ruleId] = (ruleHits[m.ruleId] || 0) + 1;
      }
    }
    return { findings: count, ruleHits };
  } catch (e) {
    return { error: `lint: ${e.message?.slice(0, 200)}` };
  }
}

// ── Corpus discovery ──────────────────────────────────────────────────

function discoverCorpus() {
  if (!fs.existsSync(CORPUS_DIR)) return [];
  const cwes = fs
    .readdirSync(CORPUS_DIR)
    .filter((d) => /^CWE-\d+$/.test(d))
    .sort();
  return cwes
    .filter((d) => !cweFilter || d === cweFilter)
    .map((cwe) => {
      const dir = path.join(CORPUS_DIR, cwe);
      const manifestPath = path.join(dir, "manifest.json");
      let manifest: any = {};
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
        } catch {}
      }
      const vulnerable = listFixtures(path.join(dir, "vulnerable"));
      const safe = listFixtures(path.join(dir, "safe"));
      return { cwe, dir, manifest, vulnerable, safe };
    })
    .filter((c) => c.vulnerable.length > 0 || c.safe.length > 0);
}

function listFixtures(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(js|ts|jsx|tsx|mjs|cjs)$/.test(f))
    .map((f) => path.join(dir, f));
}

// ── Scoring ──────────────────────────────────────────────────────────

function scoreCWE(perFixture) {
  let TP = 0,
    FN = 0,
    FP = 0,
    TN = 0;
  for (const r of perFixture) {
    if (r.expectedVulnerable) {
      if (r.findings > 0) TP++;
      else FN++;
    } else {
      if (r.findings > 0) FP++;
      else TN++;
    }
  }
  const precision = TP / Math.max(TP + FP, 1);
  const recall = TP / Math.max(TP + FN, 1);
  const f1 = (2 * precision * recall) / Math.max(precision + recall, 1e-9);
  const tpr = recall;
  const fpr = FP / Math.max(FP + TN, 1);
  const bas = tpr - fpr;
  return {
    TP,
    FP,
    FN,
    TN,
    precision: +(precision * 100).toFixed(1),
    recall: +(recall * 100).toFixed(1),
    f1: +(f1 * 100).toFixed(1),
    bas: +(bas * 100).toFixed(1),
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const corpus = discoverCorpus();
  if (corpus.length === 0) {
    console.error("ILB-Juliet corpus is empty. Expected corpus/CWE-NNN/ dirs.");
    process.exit(2);
  }
  const plugins = pluginFilter
    ? ALL_PLUGINS.filter((p) => p.name === pluginFilter)
    : ALL_PLUGINS;
  if (plugins.length === 0) {
    console.error(`Unknown plugin: ${pluginFilter}`);
    process.exit(1);
  }

  if (!EMIT_JSON) {
    console.log(`\n🧪 ILB-Juliet v1.0 — ${corpus.length} CWE${corpus.length === 1 ? "" : "s"} × ${plugins.length} plugin${plugins.length === 1 ? "" : "s"}\n`);
    for (const c of corpus) {
      console.log(
        `  ${c.cwe}: ${c.manifest.name || "(unknown)"} — ${c.vulnerable.length} vulnerable + ${c.safe.length} safe`,
      );
    }
    console.log("");
  }

  const data = {
    bench: "ILB-Juliet",
    version: "1.0",
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      eslintVersion: (() => {
        try {
          return JSON.parse(
            fs.readFileSync(
              path.join(BENCH_ROOT, "..", "node_modules", "eslint", "package.json"),
              "utf-8",
            ),
          ).version;
        } catch {
          return "unknown";
        }
      })(),
      platform: process.platform,
      arch: process.arch,
    },
    corpus: corpus.map((c) => ({
      cwe: c.cwe,
      name: c.manifest.name,
      owasp: c.manifest.owasp,
      severity: c.manifest.severity,
      expectedPlugins: c.manifest.expectedPlugins,
      counts: { vulnerable: c.vulnerable.length, safe: c.safe.length },
    })),
    plugins: {},
  };

  for (const plugin of plugins) {
    if (!EMIT_JSON) {
      console.log(`\n── ${plugin.displayName} ──`);
    }
    const pluginData = { displayName: plugin.displayName, perCwe: {}, aggregate: null };
    const aggFixtures = [];

    for (const cwe of corpus) {
      const perFixture = [];

      for (const file of cwe.vulnerable) {
        const r = await lintFixture(plugin, file);
        perFixture.push({
          file: path.basename(file),
          expectedVulnerable: true,
          ...r,
        });
      }
      for (const file of cwe.safe) {
        const r = await lintFixture(plugin, file);
        perFixture.push({
          file: path.basename(file),
          expectedVulnerable: false,
          ...r,
        });
      }

      const score = scoreCWE(perFixture);
      pluginData.perCwe[cwe.cwe] = {
        name: cwe.manifest.name,
        owasp: cwe.manifest.owasp,
        ...score,
        fixtures: perFixture,
      };
      aggFixtures.push(...perFixture);

      if (!EMIT_JSON) {
        console.log(
          `   ${cwe.cwe} (${cwe.manifest.name?.slice(0, 24).padEnd(24)}): TP=${score.TP}/${cwe.vulnerable.length} FP=${score.FP}/${cwe.safe.length} F1=${score.f1}%`,
        );
      }
    }

    pluginData.aggregate = scoreCWE(aggFixtures);
    if (!EMIT_JSON) {
      const agg = pluginData.aggregate;
      console.log(
        `   ${"AGGREGATE".padEnd(46)} TP=${agg.TP} FP=${agg.FP} FN=${agg.FN} → P=${agg.precision}% R=${agg.recall}% F1=${agg.f1}% BAS=${agg.bas}%`,
      );
    }
    data.plugins[plugin.name] = pluginData;
  }

  // Leaderboard
  if (!EMIT_JSON) {
    console.log("\n\n=========================================================");
    console.log("📋 ILB-JULIET LEADERBOARD");
    console.log("=========================================================");
    console.log("");
    console.log("| Plugin | TP | FP | FN | Precision | Recall | F1 | BAS |");
    console.log("|---|---|---|---|---|---|---|---|");
    const sorted = (Object.entries(data.plugins) as Array<[string, any]>).sort(
      (a, b) => b[1].aggregate.f1 - a[1].aggregate.f1,
    );
    for (const [, p] of sorted) {
      const a = p.aggregate;
      console.log(
        `| ${p.displayName} | ${a.TP} | ${a.FP} | ${a.FN} | ${a.precision}% | ${a.recall}% | **${a.f1}%** | ${a.bas}% |`,
      );
    }
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const date = new Date().toISOString().split("T")[0];
  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  if (!EMIT_JSON) {
    console.log(`\n✅ Results: ${path.relative(BENCH_ROOT, outPath)}`);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch((e) => {
  console.error("ilb-juliet fatal error:", e);
  process.exit(1);
});
