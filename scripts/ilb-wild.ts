#!/usr/bin/env -S npx tsx

/**
 * ILB-Wild — Interlace Wild Benchmark v1.0
 *
 * Runs Interlace plugins against a frozen corpus of popular OSS repositories
 * and reports findings density (per kLoC), plugin coverage (% of rules that
 * fired), and per-repo lint cost. See benchmarks/README.md.
 *
 * Methodology:
 *   - 1 warmup run + 3 measured runs per repo (median + stddev reported)
 *   - ESLint cache cleared between runs (.eslintcache removed)
 *   - Per-rule timing captured via TIMING=all (parsed from stderr)
 *   - Peak RSS captured via process.resourceUsage().maxRSS in the worker
 *   - LoC counted from the resolved file list (wc -l proxy)
 *   - Pinned commits per repo (frozen corpus per version)
 *
 * Usage:
 *   tsx scripts/ilb-wild.ts                  # all repos in registry
 *   tsx scripts/ilb-wild.ts --repo three.js  # single repo
 *   tsx scripts/ilb-wild.ts --list           # show target matrix
 *   tsx scripts/ilb-wild.ts --runs 1         # quick mode (1 run, no warmup)
 *   tsx scripts/ilb-wild.ts --no-reports     # skip MD report generation
 *   tsx scripts/ilb-wild.ts --results        # show last results summary
 *   tsx scripts/ilb-wild.ts --fp-corpus      # ILB-Edge mode (FP candidates)
 *
 * Output:
 *   benchmark-results/<date>/
 *     ├── summary.json
 *     ├── summary.md
 *     └── per-repo/<name>/
 *         ├── run.json
 *         ├── per-rule.json
 *         ├── findings-sample.json
 *         └── report.md
 */

import { execSync, execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

// ── Paths & Config ──────────────────────────────────────────────────

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Where to clone target OSS repos. Resolution order:
//   1. $ILB_OOS_DIR env var (CI / custom envs)
//   2. ~/repos/ofriperetz.dev/oos/ (default — shared across local benches)
//   3. <repo>/.bench-repos/ (fallback if home dir doesn't have the standard
//      layout; keeps the bench self-contained)
function resolveBenchDir() {
  if (process.env.ILB_OOS_DIR) return path.resolve(process.env.ILB_OOS_DIR);
  const oosDir = path.join(os.homedir(), 'repos', 'ofriperetz.dev', 'oos');
  if (fs.existsSync(path.dirname(oosDir))) return oosDir;
  return path.join(ROOT, '.bench-repos');
}

const BENCH_DIR = resolveBenchDir();
const WORKER_DIR = path.join(ROOT, '.bench-workers');
const RESULTS_DIR = path.join(ROOT, 'benchmark-results');
const ESLINT_CACHE = path.join(ROOT, '.eslintcache');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const eq = args.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
};

const targetRepo = opt('repo');
const RUNS = Number(opt('runs') ?? 3);
const WARMUP = RUNS >= 3 ? 1 : 0;
const FP_CORPUS_MODE = flag('fp-corpus');
const SKIP_REPORTS = flag('no-reports');
const SHOW_LIST = flag('list');
const SHOW_RESULTS = flag('results');
const PER_REPO_TIMEOUT_MS = 600_000;

// ── Target Registry ─────────────────────────────────────────────────
// Each entry has a pinned `commit` (tag, branch, or full SHA) so v1.0
// results are reproducible. Bumping commits = corpus version bump.

const BENCHMARK_REPOS = [
  // ── Tier 1: Mega (>50K stars) — adoption / brand-value targets ─────
  {
    name: 'next.js',
    repo: 'https://github.com/vercel/next.js.git',
    commit: 'v15.1.0',
    stars: 131_000,
    srcGlob: 'packages/next/src/**/*.{ts,tsx}',
    plugins: ['browser-security', 'node-security', 'secure-coding'],
    category: 'Full-Stack Framework',
    why: 'Gold-standard Next.js — lint-clean here means lint-clean anywhere',
  },
  {
    name: 'shadcn-ui',
    repo: 'https://github.com/shadcn-ui/ui.git',
    commit: '50239387ab580bec9cdf3afc925050e86c3488ed',
    stars: 100_000,
    srcGlob: 'packages/**/*.{ts,tsx}',
    plugins: ['browser-security', 'secure-coding'],
    category: 'UI Library',
    why: 'Most popular React component library — browser-security validation',
  },
  {
    name: 'three.js',
    repo: 'https://github.com/mrdoob/three.js.git',
    commit: 'r170',
    stars: 105_000,
    srcGlob: 'src/**/*.{js,ts}',
    plugins: ['browser-security', 'secure-coding', 'node-security'],
    category: '3D Graphics Engine',
    why: 'Stress-test for browser-security FP rate (eval, Function, postMessage are legitimate here)',
    fpEdge: true, // findings on this repo are FP candidates by default
  },
  {
    name: 'cal.com',
    repo: 'https://github.com/calcom/cal.com.git',
    commit: '27fc24c9063bec9442552139dd37bdc2e4a82ca8',
    stars: 35_000,
    srcGlob: 'apps/web/app/**/*.{ts,tsx}',
    plugins: ['browser-security', 'node-security', 'secure-coding', 'express-security'],
    category: 'Full-Stack SaaS',
    why: 'Auth + payments + webhooks — exercises JWT, CORS, session rules',
  },

  // ── Tier 2: Backend-heavy (10–50K) — direct audience ──────────────
  {
    name: 'nestjs',
    repo: 'https://github.com/nestjs/nest.git',
    commit: 'd69b14a85e100a689499e03190459b3d59ecd87b',
    stars: 70_000,
    srcGlob: 'packages/**/*.ts',
    plugins: ['nestjs-security', 'node-security', 'secure-coding'],
    category: 'Backend Framework',
    why: 'Direct audience — exercises nestjs-security on the framework itself',
  },
  {
    name: 'payload',
    repo: 'https://github.com/payloadcms/payload.git',
    commit: '744a8a88d5eefe246fe3c63dc35922539b1eb709',
    stars: 35_000,
    srcGlob: 'packages/payload/src/**/*.ts',
    plugins: ['node-security', 'secure-coding', 'express-security', 'mongodb-security'],
    category: 'Headless CMS',
    why: 'MongoDB-native CMS — exercises mongodb-security + express middleware rules',
  },
  {
    name: 'medusa',
    repo: 'https://github.com/medusajs/medusa.git',
    commit: 'de51a3b99e5b66d6e085e77d91886e5676a9bf3d',
    stars: 28_000,
    srcGlob: 'packages/medusa/src/**/*.ts',
    plugins: ['node-security', 'secure-coding', 'express-security', 'pg'],
    category: 'E-commerce Backend',
    why: 'PostgreSQL-native commerce — exercises pg + payment security patterns',
  },
  {
    name: 'strapi',
    repo: 'https://github.com/strapi/strapi.git',
    commit: 'c5bc749feeb5b7b4f3d845b52da41277100465a8',
    stars: 66_000,
    srcGlob: 'packages/core/strapi/src/**/*.ts',
    plugins: ['node-security', 'secure-coding', 'express-security'],
    category: 'Headless CMS',
    why: 'Plugin-heavy CMS — exercises dynamic require, CORS, auth',
  },

  // ── Tier 3: AI/ML Projects — vercel-ai-security audience ───────────
  {
    name: 'vercel-ai',
    repo: 'https://github.com/vercel/ai.git',
    commit: 'd57cf11d0e8d06bb3c2e1bcda89ad6a6a5530793',
    stars: 15_000,
    srcGlob: 'packages/*/src/**/*.ts',
    plugins: ['vercel-ai-security', 'node-security', 'secure-coding'],
    category: 'AI SDK',
    why: 'THE target for vercel-ai-security — validates rules on the SDK itself',
  },
  {
    name: 'langchain-js',
    repo: 'https://github.com/langchain-ai/langchainjs.git',
    commit: '38f82942e77bf87c138ded6f08cb875bb6fb9ba7',
    stars: 15_000,
    srcGlob: 'libs/langchain-core/src/**/*.ts',
    plugins: ['vercel-ai-security', 'node-security', 'secure-coding'],
    category: 'AI Framework',
    why: 'AI agent framework — prompt injection, output validation, tool safety',
  },

  // ── Tier 4: Security-sensitive (auth, crypto, infra) ───────────────
  {
    name: 'supabase',
    repo: 'https://github.com/supabase/supabase.git',
    commit: 'f0f3784633342072111117cfa4c7d3a32357bcbf',
    stars: 78_000,
    srcGlob: 'apps/studio/components/**/*.{ts,tsx}',
    plugins: ['browser-security', 'pg', 'jwt', 'node-security'],
    category: 'Database Platform',
    why: 'PostgreSQL-native BaaS — pg, JWT, browser-security in one codebase',
  },
  {
    name: 'appwrite',
    repo: 'https://github.com/appwrite/appwrite.git',
    commit: 'a5fa09b4ceb5945d98244612a3d8d1a780533e93',
    stars: 48_000,
    srcGlob: 'public/sdk-console/**/*.ts',
    plugins: ['node-security', 'secure-coding', 'crypto'],
    category: 'BaaS Platform',
    why: 'Auth/storage/functions — exercises crypto, session, credentials (public SDK; main is PHP)',
  },

  // ── Tier 5: Serverless ─────────────────────────────────────────────
  {
    name: 'sst',
    repo: 'https://github.com/sst/sst.git',
    commit: 'ec2847b92af0763abb7bb8177b8265f046b7443c',
    stars: 22_000,
    srcGlob: 'platform/src/**/*.ts',
    plugins: ['lambda-security', 'node-security', 'secure-coding'],
    category: 'Serverless Framework',
    why: 'SST v3 — exercises lambda-security on real infra code',
  },
  {
    name: 'serverless',
    repo: 'https://github.com/serverless/serverless.git',
    commit: 'e0d19d20755233c7297b1c955cc781268fdb0e56',
    stars: 46_000,
    srcGlob: 'packages/**/*.{js,ts}',
    plugins: ['lambda-security', 'node-security', 'secure-coding'],
    category: 'Serverless Framework',
    why: 'Serverless Framework v4 — additional lambda-security target',
  },
  {
    name: 'aws-lambda-powertools',
    repo: 'https://github.com/aws-powertools/powertools-lambda-typescript.git',
    commit: 'd47e092dc571154a221e7886539f8ff40443ca91',
    stars: 1_700,
    srcGlob: 'packages/*/src/**/*.ts',
    plugins: ['lambda-security', 'node-security', 'secure-coding'],
    category: 'Lambda Tooling',
    why: 'AWS official Lambda toolkit — handles real Lambda patterns (logger, tracer, parameters)',
  },

  // ── Tier 7: NestJS ecosystem (more nestjs-security exposure) ───────
  {
    name: 'nestjs-typeorm',
    repo: 'https://github.com/nestjs/typeorm.git',
    commit: 'c71e849084b892dfde62bd70318d2983459f69f5',
    stars: 1_700,
    srcGlob: 'lib/**/*.ts',
    plugins: ['nestjs-security', 'node-security', 'secure-coding', 'pg'],
    category: 'NestJS Module',
    why: 'NestJS + TypeORM official integration — exercises nestjs-security and pg rules together',
  },
  {
    name: 'twentyhq',
    repo: 'https://github.com/twentyhq/twenty.git',
    commit: '2e5ccd9b860bdf046d7b52b4fccdb46404954044',
    stars: 30_000,
    srcGlob: 'packages/twenty-server/src/**/*.ts',
    plugins: ['nestjs-security', 'node-security', 'secure-coding', 'pg'],
    category: 'CRM (NestJS)',
    why: 'Production NestJS application — Twenty CRM, 30K-star real-world Nest server with PostgreSQL',
  },

  {
    name: 'serverless-api-gateway-caching',
    repo: 'https://github.com/DianaIonita/serverless-api-gateway-caching.git',
    commit: '542120f7483ab1ee8213ce7499b60d62b9635aa8',
    stars: 200,
    srcGlob: 'src/**/*.js',
    plugins: ['lambda-security', 'node-security', 'secure-coding'],
    category: 'Serverless Plugin',
    why: 'Serverless framework plugin — exercises lambda-security on real deployment infra',
  },

  // ── Tier 6: ILB-Edge — adversarial-real (legitimate risky patterns) ─
  // Findings here default to FP candidates until manually annotated as TP.
  // Run with `npm run ilb:edge` to scope to this subset only.
  {
    name: 'react',
    repo: 'https://github.com/facebook/react.git',
    commit: 'd5736f098edee62c44f27b053e6e48f5fa443803',
    stars: 230_000,
    srcGlob: 'packages/react-dom/src/**/*.{js,ts}',
    plugins: ['browser-security', 'secure-coding'],
    category: 'UI Library (FP corpus)',
    why: 'react-dom legitimately uses dangerouslySetInnerHTML, postMessage, and dynamic property access — stress-test for browser-security FP rate',
    fpEdge: true,
  },
  {
    name: 'webpack',
    repo: 'https://github.com/webpack/webpack.git',
    commit: 'b29de5fcd3d22cff32b807b4a58ed02134852c20',
    stars: 65_000,
    srcGlob: 'lib/**/*.js',
    plugins: ['node-security', 'secure-coding'],
    category: 'Build Tool (FP corpus)',
    why: 'Bundler legitimately uses eval for HMR/source maps, Function constructor for runtime modules, and dynamic require — must not flag these as vulns',
    fpEdge: true,
  },
  {
    name: 'lodash',
    repo: 'https://github.com/lodash/lodash.git',
    commit: 'a02353279093cca0fea1c8cc468ffbf03bb3485b',
    stars: 60_000,
    srcGlob: 'fp/**/*.js',
    plugins: ['secure-coding', 'node-security'],
    category: 'Utility Library (FP corpus)',
    why: 'lodash/fp uses dynamic property access (get/set/has) by design — high-noise target for detect-object-injection',
    fpEdge: true,
  },
  {
    name: 'babel',
    repo: 'https://github.com/babel/babel.git',
    commit: '3b4cbdcfb7f974cad9bc11681353bf515cd72559',
    stars: 43_000,
    srcGlob: 'packages/babel-parser/src/**/*.{js,ts}',
    plugins: ['secure-coding', 'node-security'],
    category: 'Compiler (FP corpus)',
    why: 'Parser/codegen legitimately uses Function constructor and dynamic property access on AST nodes — stress-test for secure-coding FP rate',
    fpEdge: true,
  },
];

// ── ILB-Edge corpus (FP-resilience) ─────────────────────────────────
// Repos that legitimately use risky patterns. Findings are FP candidates
// until manually annotated as TP. Three.js doubles as both Wild and Edge.
const FP_EDGE_REPOS = BENCHMARK_REPOS.filter((r) => r.fpEdge);

// ── CLI commands ─────────────────────────────────────────────────────

if (SHOW_LIST) {
  showRegistry();
  process.exit(0);
}

if (SHOW_RESULTS) {
  showLastResults();
  process.exit(0);
}

// ── Main ────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('ilb-wild fatal error:', err);
  process.exit(1);
});

async function main() {
  const corpus = FP_CORPUS_MODE ? FP_EDGE_REPOS : BENCHMARK_REPOS;
  const repos = targetRepo ? corpus.filter((r) => r.name === targetRepo) : corpus;

  if (repos.length === 0) {
    console.error(
      `Unknown repo: ${targetRepo}. Use --list to see targets.${FP_CORPUS_MODE ? ' (--fp-corpus is active; FP-edge subset only)' : ''}`,
    );
    process.exit(1);
  }

  const date = new Date().toISOString().split('T')[0];
  const outDir = path.join(RESULTS_DIR, date);
  fs.mkdirSync(path.join(outDir, 'per-repo'), { recursive: true });

  console.log(
    `\nILB-Wild v1.0 — ${repos.length} repo${repos.length === 1 ? '' : 's'}, ${RUNS} runs + ${WARMUP} warmup${FP_CORPUS_MODE ? ' [FP-EDGE MODE]' : ''}\n`,
  );

  const results = [];
  for (const repo of repos) {
    console.log(`── ${repo.name} (${formatStars(repo.stars)} ⭐, pinned ${repo.commit}) ──`);
    console.log(`   ${repo.why}`);
    console.log(`   Plugins: ${repo.plugins.join(', ')}`);

    try {
      const dir = cloneRepo(repo);
      const files = findFiles(dir, repo);
      console.log(`   Files: ${files.length} matched (${repo.srcGlob})`);

      if (files.length === 0) {
        results.push({ repo: repo.name, success: false, error: 'no files matched glob' });
        console.log('   ❌ No files matched glob — check srcGlob in registry');
        continue;
      }

      const loc = countLoc(files);
      console.log(`   LoC: ${loc.toLocaleString()}`);

      const result = await benchmarkRepo(repo, dir, files, loc);
      results.push(result);

      if (!SKIP_REPORTS && result.success) {
        writePerRepoArtifacts(outDir, repo, result);
      }

      if (result.success) {
        const findings = result.findings.total;
        const density = ((findings / loc) * 1000).toFixed(2);
        console.log(
          `   ✅ median ${result.timing.medianMs}ms (±${result.timing.stddevMs}ms) | ${findings} findings | ${density}/kLoC | RSS ${result.peakRssMb}MB`,
        );
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
    } catch (err) {
      console.log(`   ❌ Setup failed: ${err.message?.slice(0, 200)}`);
      results.push({ repo: repo.name, success: false, error: err.message });
    }
  }

  // Merge with existing summary so successive `--repo X` runs accumulate
  // into a single date-stamped summary instead of overwriting it. Try/catch
  // read closes the existsSync → readFileSync → writeFileSync TOCTOU window
  // (CodeQL: `js/file-system-race`).
  const summaryPath = path.join(outDir, 'summary.json');
  let mergedRepos = results;
  let priorSummaryText: string | null = null;
  try {
    priorSummaryText = fs.readFileSync(summaryPath, 'utf-8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  if (priorSummaryText !== null) {
    try {
      const existing: any = JSON.parse(priorSummaryText);
      const byName = new Map((existing.repos || []).map((r) => [r.repo, r]));
      // Overwrite entries from current run, preserve prior ones.
      for (const r of results) byName.set(r.repo, normalizeRepoForSummary(r));
      mergedRepos = [...byName.values()];
    } catch {
      // ignore unreadable existing summary; use current run only
    }
  } else {
    mergedRepos = results.map(normalizeRepoForSummary);
  }

  const summary = buildSummary(date, mergedRepos);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  if (!SKIP_REPORTS) {
    fs.writeFileSync(path.join(outDir, 'summary.md'), renderSummaryMd(summary));
  }

  console.log(`\n📊 Results: ${path.relative(ROOT, outDir)}`);
  if (!SKIP_REPORTS) {
    console.log(`   summary.md → ${path.relative(ROOT, path.join(outDir, 'summary.md'))}`);
  }
}

// ── Repo lifecycle ──────────────────────────────────────────────────

function cloneRepo(repo) {
  fs.mkdirSync(BENCH_DIR, { recursive: true });
  const dir = path.join(BENCH_DIR, repo.name);

  if (fs.existsSync(dir)) {
    // Use execFileSync with array args — no shell, no interpolation. Closes
    // the dataflow CodeQL flagged (`js/indirect-command-line-injection`) from
    // argv/env → registry → git command argument.
    const head = safeGit(['-C', dir, 'rev-parse', 'HEAD'], { allowFail: true }).trim();
    const expected = safeGit(['-C', dir, 'rev-parse', repo.commit], { allowFail: true }).trim();
    if (expected && head && head === expected) {
      console.log(`   📂 Cached at ${repo.commit} (${head.slice(0, 7)})`);
      return dir;
    }
    if (!expected) {
      // Ref isn't in this clone (likely shallow). Try to fetch it; if that
      // fails, run on cached HEAD with a warning so we don't block on network.
      const fetched = safeGit(['-C', dir, 'fetch', '--depth', '1', 'origin', repo.commit], { allowFail: true });
      if (fetched && safeGit(['-C', dir, 'rev-parse', 'FETCH_HEAD'], { allowFail: true }).trim()) {
        safeGit(['-C', dir, 'checkout', 'FETCH_HEAD'], { allowFail: true });
        console.log(`   📥 Fetched & checked out ${repo.commit}`);
      } else {
        console.log(`   ⚠️  Could not resolve ${repo.commit} on cached clone — using HEAD ${head.slice(0, 7)}`);
      }
      return dir;
    }
    console.log(`   🔄 Cache stale — checking out ${repo.commit}`);
    safeGit(['-C', dir, 'fetch', '--depth', '1', 'origin', repo.commit], { allowFail: true });
    safeGit(['-C', dir, 'checkout', repo.commit], { allowFail: true });
    return dir;
  }

  console.log(`   ⬇️  Cloning ${repo.name}@${repo.commit} (shallow)...`);
  // Try shallow clone of the specific ref; fall back to full clone + checkout.
  try {
    execFileSync('git', ['clone', '--depth', '1', '--branch', repo.commit, '--single-branch', repo.repo, dir], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['clone', '--depth', '50', '--single-branch', repo.repo, dir], { stdio: 'pipe' });
    try {
      execFileSync('git', ['-C', dir, 'checkout', repo.commit], { stdio: 'pipe' });
    } catch {
      console.log(`   ⚠️  Could not pin to ${repo.commit}, using HEAD`);
    }
  }
  return dir;
}

function findFiles(repoDir, repo) {
  // Use the `glob` package to resolve the srcGlob relative to the repo
  // root. Filters out node_modules, .d.ts, tests, stories, and the
  // .bench-repos cache itself.
  const matches = globSync(repo.srcGlob, {
    cwd: repoDir,
    nodir: true,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/*.d.ts',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
      '**/__tests__/**',
      '**/__mocks__/**',
      '**/__fixtures__/**',
      '**/__snapshots__/**',
      '**/test-fixtures/**',
      '**/test/**',
      '**/tests/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
    ],
  });
  return matches;
}

function countLoc(files) {
  // Cheap LoC proxy: total lines in resolved files (minus blank lines).
  // For a sharper metric, swap in `cloc` if installed.
  let total = 0;
  // Process in batches to avoid ARG_MAX.
  const batchSize = 200;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize).map((f) => `"${f}"`).join(' ');
    try {
      const out = execSync(`wc -l ${batch} | tail -1`, { encoding: 'utf-8' });
      const n = parseInt(out.trim().split(/\s+/)[0], 10);
      if (Number.isFinite(n)) total += n;
    } catch {
      // ignore — partial count
    }
  }
  return total;
}

// ── Worker generation & execution ───────────────────────────────────

function buildWorkerScript(repo, files) {
  // Worker is an ESM TS file run via tsx. It loads each plugin from source,
  // and spreads each plugin's own `recommended` flat-config block. This is
  // important: plugins register themselves as `<name>` (e.g. `browser-security`),
  // not `@interlace/<name>`. Reaching into `.rules` and re-namespacing breaks
  // rule resolution silently — use the plugin's own config object instead.
  // TIMING=all is set via env in the parent; ESLint writes the rule-time
  // table to stderr at end of run (we parse it).
  // Some plugins expose configs on `default.configs`, others as a named
  // `configs` export. Import the whole module namespace and pick whichever
  // is present — avoids a hard error when one form is absent.
  const pluginImports = repo.plugins
    .map(
      (p, i) =>
        `import * as mod${i} from '${ROOT}/packages/eslint-plugin-${p}/src/index.ts';`,
    )
    .join('\n');
  const pluginConfigs = repo.plugins
    .map(
      (_, i) =>
        `(mod${i}.configs?.recommended ?? mod${i}.default?.configs?.recommended ?? mod${i}.configs?.all ?? mod${i}.default?.configs?.all)`,
    )
    .join(', ');

  // Files list as a JSON literal — avoids shell escape issues.
  const filesLiteral = JSON.stringify(files);

  return `
// Auto-generated by scripts/ilb-wild.mjs
import { ESLint } from 'eslint';
${pluginImports}

async function run() {
  const files = ${filesLiteral};

  // Filter undefined entries — a plugin may not have a recommended config.
  const pluginConfigBlocks = [${pluginConfigs}].filter(Boolean);
  if (pluginConfigBlocks.length === 0) {
    process.stdout.write(JSON.stringify({ error: 'no plugin configs resolved — check imports' }) + '\\n');
    process.exit(1);
  }

  // ESLint v9 silently ignores files outside cwd. Use the closest common
  // ancestor of the eslint repo (where plugins live) and the target repo
  // (under BENCH_DIR / oos/) so both are reachable.
  const eslint = new ESLint({
    cwd: ${JSON.stringify(path.dirname(BENCH_DIR))},
    overrideConfigFile: true,
    overrideConfig: [
      // Base language options apply to every file.
      {
        files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
        languageOptions: {
          parserOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            ecmaFeatures: { jsx: true },
          },
        },
        // Tell ESLint not to error on third-party eslint-disable comments
        // for rules we don't load — keeps the noise floor low.
        linterOptions: {
          reportUnusedDisableDirectives: 'off',
        },
      },
      // Plugin recommended configs supply their own plugin registration +
      // rule activations. Spreading them as separate config blocks lets
      // ESLint flat-config compose them without namespace conflicts.
      ...pluginConfigBlocks,
    ],
  });

  const results = await eslint.lintFiles(files);

  // Only count messages from rules we actually configured. ESLint emits
  // "Definition for rule X not found" warnings when source files contain
  // eslint-disable directives for plugins we don't load — that's noise.
  const ourPrefixes = ${JSON.stringify(repo.plugins.map((p) => p + '/'))};
  const isOurRule = (id) => !!id && ourPrefixes.some((pre) => id.startsWith(pre));

  const ruleHits = {};
  const samples = [];
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithFindings = 0;
  let externalDirectives = 0;
  let parseErrors = 0;

  for (const r of results) {
    let fileHadFinding = false;
    for (const m of r.messages) {
      if (m.fatal) { parseErrors++; continue; }
      if (!isOurRule(m.ruleId)) {
        // External plugin reference (eslint-disable for a rule we don't load),
        // or ESLint internal warning. Track count, don't count as a finding.
        if (!m.ruleId || /not found|not defined/.test(m.message || '')) externalDirectives++;
        continue;
      }
      fileHadFinding = true;
      if (m.severity === 2) totalErrors++;
      else totalWarnings++;
      const id = m.ruleId;
      ruleHits[id] = (ruleHits[id] || 0) + 1;
      if (samples.length < 50) {
        samples.push({
          ruleId: id,
          severity: m.severity === 2 ? 'error' : 'warn',
          file: r.filePath.replace(${JSON.stringify(ROOT)} + '/', ''),
          line: m.line,
          column: m.column,
          message: m.message?.slice(0, 240),
        });
      }
    }
    if (fileHadFinding) filesWithFindings++;
  }

  const ru = process.resourceUsage();
  const peakRssKb = ru.maxRSS;  // KB on Linux/macOS

  process.stdout.write(JSON.stringify({
    fileCount: results.length,
    filesWithFindings,
    totalErrors,
    totalWarnings,
    ruleHits,
    samples,
    peakRssKb,
    externalDirectives,
    parseErrors,
  }) + '\\n');
}

run().catch((e) => {
  process.stdout.write(JSON.stringify({ error: e.stack?.slice(0, 800) || String(e) }) + '\\n');
  process.exit(1);
});
`;
}

function runWorker(workerPath) {
  // ESLint reads TIMING=all and writes a per-rule table to stderr at end of
  // run. Capture both streams; parse stderr for timings.
  const result = spawnSync('npx', ['tsx', workerPath], {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 200 * 1024 * 1024,
    timeout: PER_REPO_TIMEOUT_MS,
    env: { ...process.env, TIMING: 'all' },
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    status: result.status,
    error: result.error?.message,
  };
}

function parseTimingTable(stderr) {
  // ESLint TIMING=all output looks like:
  //   Rule                                       | Time (ms) | Relative
  //   :------------------------------------------|----------:|--------:
  //   @interlace/browser-security/no-eval         |   142.000 |    25.5%
  //
  // Parse rows where the second column is a number.
  const out = {};
  const lines = stderr.split('\n');
  for (const line of lines) {
    if (!line.includes('|')) continue;
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length < 3) continue;
    const ruleId = cols[0];
    const timeMs = parseFloat(cols[1]);
    if (!Number.isFinite(timeMs) || ruleId === 'Rule' || ruleId.startsWith(':')) continue;
    out[ruleId] = (out[ruleId] || 0) + timeMs;
  }
  return out;
}

// ── Per-repo benchmark loop ─────────────────────────────────────────

async function benchmarkRepo(repo, dir, files, loc) {
  fs.mkdirSync(WORKER_DIR, { recursive: true });
  const workerPath = path.join(WORKER_DIR, `${repo.name.replace(/[^a-z0-9]/gi, '_')}.ts`);
  fs.writeFileSync(workerPath, buildWorkerScript(repo, files));

  const runs = [];
  const totalRuns = WARMUP + RUNS;

  for (let i = 0; i < totalRuns; i++) {
    const isWarmup = i < WARMUP;
    const tag = isWarmup ? 'warmup' : `run ${i - WARMUP + 1}/${RUNS}`;
    process.stdout.write(`   ⏱  ${tag}... `);

    clearEslintCache();
    const t0 = Date.now();
    const exec = runWorker(workerPath);
    const wallMs = Date.now() - t0;

    if (isWarmup) {
      console.log(`${wallMs}ms (discarded)`);
      continue;
    }

    // The worker prints exactly one JSON line; ESLint's TIMING=all may also
    // print a rule-time table to stdout. Find the JSON object explicitly.
    let stdoutData;
    const jsonLine = exec.stdout
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{') && l.endsWith('}'));
    if (jsonLine) {
      try { stdoutData = JSON.parse(jsonLine); } catch {}
    }
    if (!stdoutData) {
      console.log(`stdout-parse-error`);
      try { fs.unlinkSync(workerPath); } catch {}
      return {
        repo: repo.name,
        success: false,
        error: `worker stdout unparseable; first 200 chars: ${exec.stdout.slice(0, 200)}`,
      };
    }

    if (stdoutData.error) {
      console.log(`worker-error`);
      try { fs.unlinkSync(workerPath); } catch {}
      return { repo: repo.name, success: false, error: stdoutData.error };
    }

    // ESLint v9 prints the TIMING=all table to stdout in some configurations
    // and stderr in others. Parse both so we don't miss it.
    const ruleTimings = parseTimingTable(exec.stderr + '\n' + exec.stdout);

    runs.push({
      wallMs,
      fileCount: stdoutData.fileCount,
      filesWithFindings: stdoutData.filesWithFindings,
      totalErrors: stdoutData.totalErrors,
      totalWarnings: stdoutData.totalWarnings,
      ruleHits: stdoutData.ruleHits,
      samples: stdoutData.samples,
      peakRssKb: stdoutData.peakRssKb,
      ruleTimings,
      externalDirectives: stdoutData.externalDirectives || 0,
      parseErrors: stdoutData.parseErrors || 0,
    });
    console.log(`${wallMs}ms | ${stdoutData.totalErrors + stdoutData.totalWarnings} findings`);
  }

  try { fs.unlinkSync(workerPath); } catch {}

  if (runs.length === 0) {
    return { repo: repo.name, success: false, error: 'no measured runs' };
  }

  const wallMs = runs.map((r) => r.wallMs);
  const stats = statSummary(wallMs);
  const peakRssMb = Math.round(Math.max(...runs.map((r) => r.peakRssKb)) / 1024);

  // Findings: stable across runs (same input). Take first measured run.
  const ref = runs[0];
  const findingsTotal = ref.totalErrors + ref.totalWarnings;
  const fileCount = ref.fileCount;

  // Per-rule: merge timings (avg across runs) and hits (from ref run).
  const ruleSet = new Set([
    ...Object.keys(ref.ruleHits),
    ...Object.keys(ref.ruleTimings),
  ]);
  const perRule = {};
  for (const id of ruleSet) {
    const timings = runs.map((r) => r.ruleTimings[id]).filter((n) => Number.isFinite(n));
    perRule[id] = {
      hits: ref.ruleHits[id] || 0,
      avgTimeMs: timings.length ? +(timings.reduce((a, b) => a + b, 0) / timings.length).toFixed(2) : 0,
      samples: ref.samples.filter((s) => s.ruleId === id).slice(0, 5),
    };
  }

  // Plugin coverage: rules fired ÷ total rules in plugin (approximated by
  // counting rules in each plugin's `rules` export).
  const pluginCoverage = await computePluginCoverage(repo.plugins, ref.ruleHits);

  return {
    repo: repo.name,
    success: true,
    meta: {
      stars: repo.stars,
      commit: repo.commit,
      category: repo.category,
      plugins: repo.plugins,
      fpEdge: !!repo.fpEdge,
      srcGlob: repo.srcGlob,
    },
    fileCount,
    loc,
    findings: {
      total: findingsTotal,
      errors: ref.totalErrors,
      warnings: ref.totalWarnings,
      filesWithFindings: ref.filesWithFindings,
      densityPerKloc: +((findingsTotal / Math.max(loc, 1)) * 1000).toFixed(2),
      externalDirectives: ref.externalDirectives,
      parseErrors: ref.parseErrors,
    },
    timing: {
      runsMs: wallMs,
      medianMs: stats.median,
      meanMs: stats.mean,
      stddevMs: stats.stddev,
      cv: stats.cv,
      msPerFile: +(stats.median / Math.max(fileCount, 1)).toFixed(2),
    },
    peakRssMb,
    pluginCoverage,
    perRule,
    samples: ref.samples,
  };
}

async function computePluginCoverage(plugins, ruleHits) {
  const cov = {};
  for (const p of plugins) {
    try {
      const pluginPath = path.join(ROOT, 'packages', `eslint-plugin-${p}`, 'src', 'index.ts');
      const src = fs.readFileSync(pluginPath, 'utf-8');
      // Cheap rule-name extraction: count quoted rule keys in `rules:` block.
      // Falls back to counting top-level rule directory entries.
      const rulesDir = path.join(ROOT, 'packages', `eslint-plugin-${p}`, 'src', 'rules');
      let total = 0;
      if (fs.existsSync(rulesDir)) {
        total = fs
          .readdirSync(rulesDir, { withFileTypes: true })
          .filter((d) => d.isDirectory()).length;
      } else {
        const m = src.match(/['"][\w-]+['"]\s*:\s*\{/g);
        total = m ? m.length : 0;
      }
      const fired = Object.keys(ruleHits).filter((id) =>
        id.startsWith(`${p}/`),
      ).length;
      cov[p] = {
        total,
        fired,
        activationRate: total ? +((fired / total) * 100).toFixed(1) : 0,
      };
    } catch {
      cov[p] = { total: 0, fired: 0, activationRate: 0 };
    }
  }
  return cov;
}

// ── Stats ───────────────────────────────────────────────────────────

function statSummary(values) {
  if (values.length === 0) return { median: 0, mean: 0, stddev: 0, cv: 0 };
  const sorted = [...values].toSorted((a, b) => a - b);
  const median = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? +((stddev / mean) * 100).toFixed(1) : 0;
  return {
    median: Math.round(median),
    mean: Math.round(mean),
    stddev: Math.round(stddev),
    cv,
  };
}

// ── Output: per-repo + summary ─────────────────────────────────────

function writePerRepoArtifacts(outDir, repo, result) {
  const dir = path.join(outDir, 'per-repo', repo.name);
  fs.mkdirSync(dir, { recursive: true });

  const runJson = {
    repo: repo.name,
    meta: result.meta,
    fileCount: result.fileCount,
    loc: result.loc,
    timing: result.timing,
    peakRssMb: result.peakRssMb,
    findings: result.findings,
  };
  fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify(runJson, null, 2));
  fs.writeFileSync(path.join(dir, 'per-rule.json'), JSON.stringify(result.perRule, null, 2));
  fs.writeFileSync(
    path.join(dir, 'findings-sample.json'),
    JSON.stringify(result.samples, null, 2),
  );
  fs.writeFileSync(path.join(dir, 'report.md'), renderPerRepoMd(repo, result));
}

function renderPerRepoMd(repo: any, r: any) {
  const topRulesByHits = (Object.entries(r.perRule) as Array<[string, any]>)
    .toSorted((a, b) => b[1].hits - a[1].hits)
    .slice(0, 10);
  const topRulesByTime = (Object.entries(r.perRule) as Array<[string, any]>)
    .toSorted((a, b) => b[1].avgTimeMs - a[1].avgTimeMs)
    .slice(0, 10);

  const cov = (Object.entries(r.pluginCoverage) as Array<[string, any]>)
    .map(([p, c]) => `| ${p} | ${c.fired} / ${c.total} | ${c.activationRate}% |`)
    .join('\n');

  const hitRows = topRulesByHits
    .map(([id, c]) => `| \`${id}\` | ${c.hits} | ${c.avgTimeMs} ms |`)
    .join('\n');
  const timeRows = topRulesByTime
    .map(([id, c]) => `| \`${id}\` | ${c.avgTimeMs} ms | ${c.hits} |`)
    .join('\n');

  const sampleRows = r.samples
    .slice(0, 15)
    .map((s) => {
      // Escape `\` BEFORE escaping `|` — otherwise a literal `\` in the
      // message gets re-interpreted as a markdown escape character (CodeQL:
      // `js/incomplete-sanitization`). Also collapse whitespace and trim.
      const msg = (s.message || '')
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\s+/g, ' ')
        .trim();
      return `- \`${s.ruleId}\` — ${s.file}:${s.line} — ${msg}`;
    })
    .join('\n');

  const fpHeader = repo.fpEdge
    ? `\n>\n> ⚠️ **ILB-Edge target.** Findings here default to FP candidates until manually annotated as TP. See per-rule samples below for triage.`
    : '';

  return `# ILB-Wild — ${repo.name}

> Pinned: \`${r.meta.commit}\` · ${formatStars(r.meta.stars)} ⭐ · ${r.meta.category}${fpHeader}

## Summary

| Metric | Value |
|---|---|
| Files linted | ${r.fileCount.toLocaleString()} |
| Lines of code | ${r.loc.toLocaleString()} |
| Total findings | ${r.findings.total} (${r.findings.errors} errors, ${r.findings.warnings} warnings) |
| Findings density | **${r.findings.densityPerKloc} / kLoC** |
| Files with findings | ${r.findings.filesWithFindings} (${((r.findings.filesWithFindings / r.fileCount) * 100).toFixed(1)}%) |
| Wall-clock (median, ${r.timing.runsMs.length} runs) | **${r.timing.medianMs} ms** (±${r.timing.stddevMs}, CV ${r.timing.cv}%) |
| Per-file lint cost | ${r.timing.msPerFile} ms/file |
| Peak RSS | ${r.peakRssMb} MB |

## Plugin coverage

How many of each plugin's rules fired at least once on this codebase.

| Plugin | Rules fired | Activation |
|---|---|---|
${cov}

## Top rules by hit count

| Rule | Hits | Avg time |
|---|---|---|
${hitRows || '| — | — | — |'}

## Top rules by execution time

| Rule | Avg time | Hits |
|---|---|---|
${timeRows || '| — | — | — |'}

## Sample findings (first 15)

${sampleRows || '_(no findings)_'}

## Methodology

- ILB-Wild v1.0 — \`scripts/ilb-wild.mjs\`
- ${WARMUP} warmup + ${r.timing.runsMs.length} measured runs, cache cleared between runs
- ESLint v9 via \`tsx\` (source-tree builds)
- Per-rule timing via \`TIMING=all\` (parsed from stderr)
- Peak RSS via \`process.resourceUsage().maxRSS\` in worker
- Glob: \`${r.meta.srcGlob}\`
`;
}

function normalizeRepoForSummary(r) {
  // Already normalized (from existing summary)?
  if (r.repo && r.success !== undefined && !r.perRule) return r;
  if (!r.success) return { repo: r.repo, success: false, error: r.error };
  return {
    repo: r.repo,
    success: true,
    category: r.meta.category,
    commit: r.meta.commit,
    fpEdge: r.meta.fpEdge,
    loc: r.loc,
    fileCount: r.fileCount,
    findings: r.findings,
    timing: r.timing,
    peakRssMb: r.peakRssMb,
    pluginCoverage: r.pluginCoverage,
    // Compact per-plugin firedRuleIds for ILB-Cov aggregation.
    firedRuleIds: Object.entries(r.perRule || {})
      .filter(([, info]) => (info as any).hits > 0)
      .map(([id]) => id),
  };
}

function buildSummary(date, normalizedResults) {
  const ok = normalizedResults.filter((r) => r.success);
  const fail = normalizedResults.filter((r) => !r.success);

  // Aggregate per-plugin across the corpus. "rulesEverFired" counts rules
  // that produced ≥ 1 finding in any repo — not rules that were merely
  // evaluated. Evaluation count would conflate rule-loading-works with
  // rule-detected-something, which is the metric we actually care about.
  const pluginAgg: Record<string, any> = {};
  for (const r of ok) {
    for (const [p, c] of Object.entries(r.pluginCoverage || {})) {
      if (!pluginAgg[p]) pluginAgg[p] = { totalRules: (c as any).total, repos: 0, firedAcrossRepos: new Set() };
      pluginAgg[p].repos++;
      const firedWithHits = (r.firedRuleIds || []).filter((id) => id.startsWith(`${p}/`));
      for (const id of firedWithHits) pluginAgg[p].firedAcrossRepos.add(id);
    }
  }
  const pluginRollup = Object.fromEntries(
    Object.entries(pluginAgg).map(([p, v]) => [
      p,
      {
        reposExercising: v.repos,
        rulesEverFired: v.firedAcrossRepos.size,
        totalRules: v.totalRules,
        corpusActivationRate: v.totalRules
          ? +((v.firedAcrossRepos.size / v.totalRules) * 100).toFixed(1)
          : 0,
      },
    ]),
  );

  const totalLoc = ok.reduce((s, r) => s + r.loc, 0);
  const totalFindings = ok.reduce((s, r) => s + r.findings.total, 0);

  return {
    bench: 'ILB-Wild',
    version: '1.0',
    date,
    fpCorpusMode: FP_CORPUS_MODE,
    runs: RUNS,
    warmup: WARMUP,
    corpusSize: normalizedResults.length,
    success: ok.length,
    failed: fail.length,
    aggregate: {
      totalLoc,
      totalFindings,
      avgDensityPerKloc: totalLoc ? +((totalFindings / totalLoc) * 1000).toFixed(2) : 0,
    },
    pluginRollup,
    repos: normalizedResults,
  };
}

function renderSummaryMd(s: any) {
  const repoRows = s.repos
    .map((r) => {
      if (!r.success) return `| ${r.repo} | ❌ | — | — | — | — | ${r.error?.slice(0, 60) || ''} |`;
      const flags = r.fpEdge ? ' 🔬' : '';
      return `| ${r.repo}${flags} | ✅ | ${r.loc.toLocaleString()} | ${r.fileCount} | ${r.findings.total} | ${r.findings.densityPerKloc} | ${r.timing.medianMs}ms |`;
    })
    .join('\n');

  const pluginRows = (Object.entries(s.pluginRollup) as Array<[string, any]>)
    .toSorted((a, b) => b[1].corpusActivationRate - a[1].corpusActivationRate)
    .map(
      ([p, v]) =>
        `| ${p} | ${v.reposExercising} | ${v.rulesEverFired} / ${v.totalRules} | ${v.corpusActivationRate}% |`,
    )
    .join('\n');

  return `# ILB-Wild v${s.version} — ${s.date}${s.fpCorpusMode ? ' (FP-Edge mode)' : ''}

> Bench: **Interlace Wild** · Methodology: \`benchmarks/README.md\`
> ${s.success}/${s.corpusSize} repos succeeded · ${s.runs} runs + ${s.warmup} warmup per repo
> Total corpus: ${s.aggregate.totalLoc.toLocaleString()} LoC · ${s.aggregate.totalFindings} findings · **${s.aggregate.avgDensityPerKloc} findings / kLoC**

## Per-repo results

| Repo | Status | LoC | Files | Findings | /kLoC | Median time |
|---|---|---|---|---|---|---|
${repoRows}

🔬 = ILB-Edge target (findings = FP candidates pending triage)

## Plugin activation across the corpus

How much of each plugin's rule surface fired at least once anywhere in the corpus. Low activation = either dead rules or under-represented patterns.

| Plugin | Repos exercising | Rules fired | Corpus activation |
|---|---|---|---|
${pluginRows}

## How to read these numbers

- **/kLoC** is exposure, not accuracy. Real-world repos lack ground truth, so we cannot compute precision/recall here. For accuracy use ILB-Juliet (synthetic CWE corpus).
- **Median time** has cache cleared between runs; CV reported per-repo.
- **Plugin activation** at 100% means every rule found at least one match somewhere. Stable < 50% across versions = dead rules to investigate.
- **FP-Edge repos** intentionally use risky-looking patterns. Findings there should be triaged as FP unless confirmed otherwise.

_Generated by \`scripts/ilb-wild.mjs\`_
`;
}

// ── Helpers ─────────────────────────────────────────────────────────

function clearEslintCache() {
  if (fs.existsSync(ESLINT_CACHE)) {
    try { fs.rmSync(ESLINT_CACHE, { recursive: true, force: true }); } catch {}
  }
}

// `safeGit` runs git via `execFileSync` (no shell, no interpolation), so
// arbitrary characters in `args` cannot influence command parsing. This is the
// shape CodeQL's `js/indirect-command-line-injection` query recognizes as a
// sanitizer for argv/env data flowing into a git invocation. Replaced the
// prior `safeExec` shell-wrapper, which was the source of the 4 alerts.
function safeGit(args: string[], opts: { allowFail?: boolean } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (e: any) {
    if (opts.allowFail) return e.stdout?.toString() || '';
    throw e;
  }
}

function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function showRegistry() {
  console.log('\nILB-Wild target registry (v1.0)\n');
  console.log(
    '┌─────────────────────┬──────────┬──────────┬──────────────────────┬───────────────────────────┐',
  );
  console.log(
    '│ Repository          │ Pin      │ Stars    │ Category             │ Plugins                   │',
  );
  console.log(
    '├─────────────────────┼──────────┼──────────┼──────────────────────┼───────────────────────────┤',
  );
  for (const r of BENCHMARK_REPOS) {
    const flag = r.fpEdge ? ' 🔬' : '';
    console.log(
      `│ ${(r.name + flag).padEnd(19)} │ ${r.commit.padEnd(8)} │ ${formatStars(r.stars).padEnd(8)} │ ${r.category.padEnd(20)} │ ${r.plugins.join(', ').slice(0, 25).padEnd(25)} │`,
    );
  }
  console.log(
    '└─────────────────────┴──────────┴──────────┴──────────────────────┴───────────────────────────┘',
  );
  console.log(`\n  ${BENCHMARK_REPOS.length} repos · 🔬 = ILB-Edge (FP candidates)`);
  console.log(`  ILB-Edge subset: ${FP_EDGE_REPOS.map((r) => r.name).join(', ')}\n`);
}

function showLastResults() {
  if (!fs.existsSync(RESULTS_DIR)) {
    console.log('No benchmark results yet. Run `npm run ilb:wild` first.');
    return;
  }
  // Find latest date dir or legacy <date>.json file.
  const entries = fs.readdirSync(RESULTS_DIR);
  const dirs = entries.filter((e) => fs.statSync(path.join(RESULTS_DIR, e)).isDirectory()).toSorted().toReversed();
  const legacyFiles = entries.filter((e) => e.endsWith('.json')).toSorted().toReversed();

  if (dirs.length > 0) {
    const latest = dirs[0];
    const summaryPath = path.join(RESULTS_DIR, latest, 'summary.json');
    if (fs.existsSync(summaryPath)) {
      const s: any = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
      console.log(`\n📊 Latest: ${latest} — ${s.bench} v${s.version}\n`);
      for (const r of s.repos) {
        if (!r.success) {
          console.log(`  ❌ ${r.repo}: ${r.error?.slice(0, 80) || 'unknown error'}`);
        } else {
          console.log(
            `  ✅ ${r.repo}: ${r.timing.medianMs}ms · ${r.fileCount} files · ${r.findings.total} findings · ${r.findings.densityPerKloc}/kLoC · ${r.peakRssMb}MB`,
          );
        }
      }
      console.log(
        `\n  Total: ${s.aggregate.totalLoc.toLocaleString()} LoC, ${s.aggregate.totalFindings} findings, ${s.aggregate.avgDensityPerKloc}/kLoC\n`,
      );
      return;
    }
  }

  if (legacyFiles.length > 0) {
    console.log(`\n📊 Legacy results: ${legacyFiles[0]} (run ilb:wild for v1.0 schema)\n`);
    return;
  }

  console.log('No results found.');
}
