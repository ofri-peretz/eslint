/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ILB-Preset-Budget — what a developer sees the moment they install us.
 *
 * Every other bench asks whether a rule is *right*. This one asks whether the
 * preset is **keepable**, which is a different question and the one that
 * decides adoption: a `recommended` that prints hundreds of findings on a
 * healthy repository gets removed the same afternoon, however correct each
 * finding is.
 *
 * It also closes the ecosystem's largest measurement blind spot.
 * `ILB-Corpus-Truth` measures 151 rules across the SDK plugins — but **224
 * rules have no coverage at all**, and they are the ones with the users:
 * `import-next` (55), `browser-security` (45), `node-security` (37),
 * `react-a11y` (37), `secure-coding` (29). By downloads that is roughly
 * three-quarters of consumer demand measured by nothing. Those plugins have no
 * SDK to gate on, so off-SDK is meaningless for them; findings-per-repository
 * is not.
 *
 * The unit is **one repository**, not one file, because that is the unit a
 * developer experiences. A plugin that adds two findings to each of 400 files
 * is not "low noise".
 *
 * Reported per plugin, over every corpus repository:
 *
 *   median / p90 / max  findings per repository under `recommended`
 *   cleanRepos          repositories it says nothing about at all
 *   topRules            the rules carrying the volume, which is where a
 *                       demotion or a fix actually changes the number
 *
 * Usage:
 *   npm run ilb:preset-budget
 *   npm run ilb:preset-budget -- --json
 *   npm run ilb:preset-budget -- --update-baseline
 *   ILB_CORPUS_TRUTH_DIR=/path npm run ilb:preset-budget
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import tsparser from '@typescript-eslint/parser';
import { cloneRepo, resolveBenchDir, type RepoSpec } from '../../lib/clone-repo.ts';
import { getToolchain } from '../../lib/toolchain.ts';
import { capturePreregistration } from '../../lib/preregister.ts';
import { appendHistory } from '../../lib/history.ts';
import {
  corpusHash,
  driftedRoots,
  headOf,
  manifestDelta,
  type CorpusRoot,
} from '../ilb-corpus-truth/corpus-identity.ts';
import {
  RESOLUTION_DEPENDENT,
  percentile,
  recommendedRules,
} from './preset-stats.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.resolve(HERE, '../..');
const REPO_ROOT = path.resolve(BENCH_ROOT, '..');
const RESULTS_DIR = path.join(BENCH_ROOT, 'results', 'ilb-preset-budget');
const BASELINE_PATH = path.join(HERE, 'baseline.json');
const REPOS_PATH = path.join(HERE, '../ilb-corpus-truth/repos.json');

const ARGS = process.argv.slice(2);
const EMIT_JSON = ARGS.includes('--json');
const UPDATE_BASELINE = ARGS.includes('--update-baseline');

const log = (msg: string): void => {
  if (!EMIT_JSON) console.log(msg);
};

/**
 * Every published plugin. Unlike ILB-Corpus-Truth this list is not about SDKs —
 * a preset is a preset — so the platform and quality plugins are first-class
 * here, which is the point.
 */
const PLUGINS: readonly string[] = [
  // The unmeasured majority, by downloads.
  'import-next',
  'secure-coding',
  'node-security',
  'browser-security',
  'react-a11y',
  'react-features',
  'conventions',
  'maintainability',
  'modernization',
  'modularity',
  'operability',
  'reliability',
  // Already covered for off-SDK; their preset budget is still unmeasured.
  'express-security',
  'nestjs-security',
  'lambda-security',
  'mongodb-security',
  'postgresql-security',
  'jwt-security',
  'vercel-ai-security',
  'mysql-security',
  'knex-security',
  'drizzle-security',
  'sqlite-security',
  'prisma-security',
  'typeorm-security',
  'sequelize-security',
  'openai-security',
  'anthropic-security',
  'gemini-security',
  'mcp-sdk-security',
];


const SOURCE_FILE = /\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$/;
const SKIP_DIR =
  /^(node_modules|dist|build|coverage|vendor|fixtures|__fixtures__|\.git|\.next|\.nuxt|\.output|\.turbo)$/;

function statIsDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function sourceFilesIn(root: string, seen: Set<string>): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let real: string;
    try {
      real = fs.realpathSync(dir);
    } catch {
      return;
    }
    if (seen.has(real)) return;
    seen.add(real);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const isDir =
        entry.isDirectory() || (entry.isSymbolicLink() && statIsDir(full));
      if (isDir) {
        if (!SKIP_DIR.test(entry.name)) walk(full);
      } else if (SOURCE_FILE.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        out.push(full);
      }
    }
  };
  walk(root);
  return out;
}

type PluginBudget = {
  plugin: string;
  recommendedRules: number;
  reposLinted: number;
  median: number;
  p90: number;
  max: number;
  worstRepo: string | null;
  cleanRepos: number;
  totalFindings: number;
  topRules: Array<{ rule: string; findings: number }>;
};

async function main(): Promise<void> {
  const prereg = capturePreregistration({
    allowDirty: true,
    entrypoint: import.meta.url,
  });
  const toolchain = getToolchain();

  const repos = JSON.parse(fs.readFileSync(REPOS_PATH, 'utf8')) as Array<
    RepoSpec & { corpus: string }
  >;
  log(`\n💸 ILB-Preset-Budget — ${PLUGINS.length} plugins over ${repos.length} repositories\n`);

  const override = process.env.ILB_CORPUS_TRUTH_DIR;
  const corpusRoots: CorpusRoot[] = [];
  if (override) {
    log(`   Using ILB_CORPUS_TRUTH_DIR=${override}`);
    for (const entry of fs.readdirSync(override)) {
      const full = path.join(override, entry);
      if (!statIsDir(full)) continue;
      corpusRoots.push({ name: entry, dir: full, head: headOf(full) });
    }
  } else {
    const benchDir = resolveBenchDir(REPO_ROOT);
    for (const repo of repos) {
      corpusRoots.push({
        name: repo.name,
        dir: cloneRepo(repo, benchDir),
        head: headOf(cloneRepo(repo, benchDir)),
      });
    }
  }

  // Same corpus discipline as ILB-Corpus-Truth: a budget recorded against a
  // corpus nobody else measures is not a budget.
  const pinned = new Map(repos.map((r) => [r.name, r.commit]));
  const drifted = driftedRoots(corpusRoots, pinned);
  const delta = manifestDelta(corpusRoots, repos.map((r) => r.name));
  const hash = corpusHash(corpusRoots);
  if (delta.missing.length > 0 || drifted.length > 0) {
    log(
      `\n⚠️  corpus: ${delta.missing.length} missing, ${drifted.length} not at their pinned commit`,
    );
  }
  if (UPDATE_BASELINE && (delta.missing.length > 0 || drifted.length > 0)) {
    console.error(
      '\n❌ Refusing to record a budget from an incomplete or drifted corpus.',
    );
    process.exitCode = 1;
    return;
  }

  // Every plugin's `recommended` is loaded into ONE config and the corpus is
  // linted once, with findings attributed back by rule prefix. Linting per
  // plugin would be thirty passes over 107 repositories for a number that is
  // identical either way — the presets do not interact, because a rule reports
  // on its own behalf.
  const plugins: Record<string, unknown> = {};
  const rules: Record<string, unknown> = {};
  const ruleOwner = new Map<string, string>();
  const recommendedCount = new Map<string, number>();
  const excluded: string[] = [];

  for (const name of PLUGINS) {
    const mod = await import(`${REPO_ROOT}/packages/eslint-plugin-${name}/src/index.ts`);
    const preset = recommendedRules((mod as { configs?: unknown }).configs);
    const entries = Object.entries(preset);
    if (entries.length === 0) {
      log(`   ${name.padEnd(22)} no recommended preset — skipped`);
      continue;
    }
    // The plugin key the preset's rule ids already use, e.g. `secure-coding/x`.
    const key = entries[0][0].split('/')[0];
    plugins[key] = (mod.default ?? mod) as unknown;
    recommendedCount.set(
      name,
      entries.filter(([id]) => !RESOLUTION_DEPENDENT.has(id)).length,
    );
    for (const [id, severity] of entries) {
      if (RESOLUTION_DEPENDENT.has(id)) {
        excluded.push(id);
        continue;
      }
      rules[id] = severity;
      ruleOwner.set(id, name);
    }
  }
  log(`\n⚙️  ${Object.keys(rules).length} recommended rules across ${recommendedCount.size} plugins`);
  if (excluded.length > 0) {
    log(
      `   ${excluded.length} rules excluded — they resolve module specifiers and the ` +
        'corpus has no installed dependencies:',
    );
    log(`     ${excluded.join(', ')}\n`);
  }

  // Rebuilt per repository. One instance across 107 repositories, 30 plugins and
  // 282 rules exhausted the heap: ESLint retains per-file state for the life of
  // the instance, and at this scale that is hundreds of thousands of ASTs. A
  // fresh instance per repository bounds it, and construction is negligible
  // beside linting a repository.
  const makeEslint = (): ESLint => new ESLint({
    cwd: override ? path.resolve(override) : resolveBenchDir(REPO_ROOT),
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: {
      files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
      linterOptions: { reportUnusedDisableDirectives: 'off' },
      languageOptions: {
        parser: tsparser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      plugins,
      // The presets verbatim. Re-deriving severities would measure a config no
      // user ever installs.
      rules: rules as never,
    },
  });

  const perRepo = new Map<string, Map<string, number>>(); // plugin → repo → findings
  const byRule = new Map<string, number>();
  for (const name of recommendedCount.keys()) perRepo.set(name, new Map());

  let scanned = 0;
  let errors = 0;

  for (const root of corpusRoots) {
    const files = sourceFilesIn(root.dir, new Set());
    if (files.length === 0) continue;
    const eslint = makeEslint();
    for (const name of recommendedCount.keys()) perRepo.get(name)!.set(root.name, 0);

    for (let i = 0; i < files.length; i += 300) {
      let results;
      try {
        results = await eslint.lintFiles(files.slice(i, i + 300));
      } catch {
        continue;
      }
      for (const res of results) {
        scanned++;
        for (const msg of res.messages) {
          if (!msg.ruleId) {
            errors++;
            continue;
          }
          const owner = ruleOwner.get(msg.ruleId);
          if (owner === undefined) continue;
          const repos = perRepo.get(owner)!;
          repos.set(root.name, (repos.get(root.name) ?? 0) + 1);
          byRule.set(msg.ruleId, (byRule.get(msg.ruleId) ?? 0) + 1);
        }
      }
    }
  }

  if (scanned === 0 || errors > scanned) {
    console.error(
      `\n❌ ${scanned} files scanned with ${errors} parse/config errors — ` +
        'the run describes the harness, not the presets. Refusing to report.',
    );
    process.exitCode = 1;
    return;
  }
  log(`   scanned ${scanned} files, ${errors} parse/config errors\n`);

  const budgets: PluginBudget[] = [];
  for (const [name, ruleCount] of recommendedCount) {
    const counts = [...perRepo.get(name)!.entries()];
    const sorted = counts.map(([, n]) => n).sort((a, b) => a - b);
    const worst = counts.reduce(
      (acc, [repo, n]) => (n > acc.findings ? { repo, findings: n } : acc),
      { repo: '', findings: -1 },
    );
    budgets.push({
      plugin: name,
      recommendedRules: ruleCount,
      reposLinted: counts.length,
      median: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
      max: worst.findings < 0 ? 0 : worst.findings,
      worstRepo: worst.repo || null,
      cleanRepos: counts.filter(([, n]) => n === 0).length,
      totalFindings: sorted.reduce((a, b) => a + b, 0),
      topRules: [...byRule]
        .filter(([id]) => ruleOwner.get(id) === name)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([rule, findings]) => ({ rule, findings })),
    });
  }
  budgets.sort((a, b) => b.median - a.median);
  for (const b of budgets) {
    log(
      `   ${b.plugin.padEnd(22)} median ${String(b.median).padStart(5)}  p90 ${String(b.p90).padStart(6)}  max ${String(b.max).padStart(6)}  clean ${b.cleanRepos}/${b.reposLinted}`,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Preset-Budget',
    benchVersion: '1.0',
    timestamp: new Date().toISOString(),
    methodologyCommit: prereg.methodologyCommit,
    methodologyHash: prereg.methodologyHash,
    methodologyPaths: prereg.methodologyPaths,
    toolchain,
    preregistration: prereg,
    cost: {},
    latency: {},
    effectiveness: {
      // No F1 here on purpose: this bench measures what a preset costs its
      // reader, not whether a finding is correct.
      medianFindingsPerRepo: percentile(
        budgets.map((b) => b.median).sort((a, b) => a - b),
        0.5,
      ),
      pluginsOverBudget: 0, // filled below once the baseline is known
    },
    corpus: {
      repos: corpusRoots.length,
      resolutionRulesExcluded: excluded,
      hash,
      rootsDrifted: drifted.length,
      rootsMissing: delta.missing.length,
    },
    budgets,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `${date}.json`);

  if (UPDATE_BASELINE) {
    const baseline = {
      generatedAt: result.timestamp,
      corpusHash: hash,
      note:
        'Median findings per repository under each plugin’s `recommended`. ' +
        'A preset a developer deletes on install protects nobody, so this is a ' +
        'ceiling, not a target. Lower it deliberately; raising it needs a reason ' +
        'in the PR body.',
      medians: Object.fromEntries(budgets.map((b) => [b.plugin, b.median])),
    };
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    appendHistory(result, outPath);
    log(`\n📌 Baseline recorded: ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
    appendHistory(result, outPath);
    log('\n⚠️  No baseline — run with --update-baseline to record one.');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    corpusHash?: string;
    medians: Record<string, number>;
  };
  if (baseline.corpusHash !== undefined && baseline.corpusHash !== hash) {
    console.error(
      `\n❌ Corpus mismatch — refusing to compare.\n   baseline: ${baseline.corpusHash}\n   this run: ${hash}`,
    );
    process.exitCode = 1;
    return;
  }

  const regressions = budgets.filter(
    (b) => baseline.medians[b.plugin] !== undefined && b.median > baseline.medians[b.plugin],
  );
  result.effectiveness.pluginsOverBudget = regressions.length;
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  if (EMIT_JSON) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  log(`\n✅ Results: ${path.relative(REPO_ROOT, outPath)}`);

  if (regressions.length > 0) {
    console.error('\n❌ Presets got noisier:');
    for (const b of regressions) {
      console.error(
        `   ${b.plugin.padEnd(22)} median ${baseline.medians[b.plugin]} → ${b.median} per repository`,
      );
    }
    process.exitCode = 1;
  }
}

await main();
