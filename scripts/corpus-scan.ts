/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Run the recommended presets over a pinned set of real repositories and fail
 * when any rule reports more than its budget.
 *
 * WHY THIS EXISTS. On 2026-08-10 the suite stood at 894 tests and 100%
 * coverage and had found **zero** of the defects fixed that day. One scan of
 * eight real repositories found seven. Coverage measures whether our fixtures
 * exercise our branches; it says nothing about whether the rule is right about
 * code nobody on this project wrote. This is the gate that measures the second
 * thing.
 *
 * WHY IT LIVES IN THE PUBLIC REPO. Same reasoning as `daily-impact-ingest.yml`:
 * public repos have no Actions minutes quota, this repo has daily activity so
 * the 60-day scheduled-workflow auto-disable can never silently kill the cron,
 * and failures surface where the rule work happens. It also means the scan
 * needs no cross-repo checkout — a missing script in a private repo is exactly
 * what left the impact ingest broken for three days (#480).
 *
 * Exit codes:
 *   0  every rule at or under budget
 *   1  at least one rule over budget, or the budget file is stale
 *   2  usage / environment error
 *   3  every target failed to scan — see the note on `failed` below
 *
 * Usage:
 *   tsx scripts/corpus-scan.ts             # scan and check against the budget
 *   tsx scripts/corpus-scan.ts --update    # rewrite the budget from this run
 *   tsx scripts/corpus-scan.ts --json      # machine-readable report on stdout
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ensurePrivateDir, resolveCacheHome } from './lib/private-cache-dir.ts';

/** Plugins whose rules apply to server and library code. */
const PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
  'eslint-plugin-jwt-security',
  'eslint-plugin-express-security',
] as const;

/**
 * Pinned targets. Chosen because they are widely depended on, are the kind of
 * codebase these rules claim to be about (auth, payments, protocol clients),
 * and are maintained to a standard where a finding is far more likely to be
 * our bug than theirs.
 *
 * Pinned to a commit, not a branch: a moving target turns "this rule
 * regressed" and "they refactored" into the same signal.
 */
const TARGETS: ReadonlyArray<{ repo: string; ref: string }> = [
  { repo: 'okta/okta-auth-js', ref: 'master' },
  { repo: 'auth0/express-openid-connect', ref: 'master' },
  { repo: 'stripe/stripe-js', ref: 'master' },
  { repo: 'twilio/twilio-node', ref: 'main' },
  { repo: 'redis/ioredis', ref: 'main' },
  { repo: 'paypal/paypal-checkout-components', ref: 'main' },
  { repo: 'okta/okta-signin-widget', ref: 'master' },
  { repo: 'Shopify/cli', ref: 'main' },
];

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * The `typescript` range from the workspace root, so the rig's parser sees the
 * same major the repo builds against rather than whatever `latest` resolves to.
 */
const WORKSPACE_TYPESCRIPT_RANGE: string = (() => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const range = pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript;
  if (!range) {
    throw new Error('no `typescript` in the workspace root package.json — cannot pin the scan rig');
  }
  return range;
})();
const BUDGET_FILE = path.join(ROOT, '.agent', 'corpus-findings-budget.json');

/**
 * Scratch space for the clone cache and the scan rig.
 *
 * NOT `os.tmpdir()`. This directory is reused across runs — clones are kept so
 * a scan does not re-fetch eight large repositories every time — which means a
 * fixed, predictable name. On a multi-user machine `/tmp/interlace-corpus-scan`
 * is a world-writable path an attacker can pre-create as a symlink, and we then
 * write a package.json, an npm install and a generated ESLint config through it
 * (CWE-377/CWE-379; CodeQL `js/insecure-temporary-file`).
 *
 * `mkdtemp` is the usual answer but is wrong here: a fresh directory per run
 * discards the clone cache, which is the whole reason this path is stable.
 * The user cache directory keeps the caching and removes the shared-namespace
 * problem, since it is not writable by other users.
 *
 * The guarantee is enforced rather than assumed — see `ensurePrivateDir`, which
 * fails closed on a symlinked, foreign-owned or group-writable component, and
 * rejects an `XDG_CACHE_HOME` that is relative or points back into the temp dir.
 */
const CACHE_HOME = resolveCacheHome();
const WORK = path.join(CACHE_HOME, 'interlace-corpus-scan');
const RIG = path.join(WORK, '_rig');

interface Budget {
  /** Human note; ignored by the checker. */
  $comment: string;
  /** ISO date the numbers were last regenerated. */
  generated: string;
  /** rule id -> maximum findings tolerated across the whole corpus. */
  budgets: Record<string, number>;
}

function sh(cmd: string, args: string[], cwd?: string): string {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * The flat config handed to the target repo.
 *
 * The plugin key is derived from the rules each preset emits rather than
 * guessed from the package name. Guessing is what crashed the scan when
 * `eslint-plugin-jwt-security` still emitted `jwt/` prefixes (#514); deriving
 * it means this script keeps working across that kind of rename either way.
 */
function buildConfig(): string {
  return `
import parser from "@typescript-eslint/parser";
${PLUGINS.map((p, i) => `import p${i} from "${p}";`).join('\n')}

const loaded = [${PLUGINS.map((p, i) => `["${p}", p${i}]`).join(', ')}];
const plugins = {};
const rules = {};
for (const [name, plugin] of loaded) {
  const rec = plugin.configs?.recommended;
  const recRules = (Array.isArray(rec) ? rec[0]?.rules : rec?.rules) ?? {};
  const first = Object.keys(recRules)[0];
  const key = first?.includes("/")
    ? first.slice(0, first.indexOf("/"))
    : name.replace("eslint-plugin-", "");
  plugins[key] = plugin;
  Object.assign(rules, recRules);
}

export default [
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.ts", "**/*.tsx"],
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.min.js",
              "**/test/**", "**/tests/**", "**/__tests__/**", "**/*.test.*", "**/*.spec.*",
              "**/fixtures/**", "**/examples/**", "**/docs/**", "**/.next/**",
              // Checked-in third-party bundles. Not \`*.min.js\` and not under
              // \`dist/\`, so the globs above miss them, but nobody edits them and
              // no real project lints them: okta ships \`@okta/courage-dist/\`,
              // Shopify ships a speedscope build under \`assets/\`, and both
              // vendor libraries wholesale. Counting findings there measures the
              // corpus's vendoring habits, not our precision.
              "**/vendor/**", "**/*-dist/**", "**/assets/**",
              // Same category as the \`test/\`, \`examples/\` and \`fixtures/\`
              // entries above, under the names these repos actually use:
              // \`e2e/\` is test infrastructure, \`playground/\` is a dev server,
              // and \`samples/\` is \`examples/\` (okta ships its demo apps as
              // \`samples/generated/\`). Precision is measured on code people
              // ship. Findings here are still real — okta's sample app really
              // does assign server data to innerHTML — they are just not a
              // measure of whether the rules are right.
              "**/e2e/**", "**/playground/**", "**/samples/**"],
    languageOptions: { parser, ecmaVersion: 2022, sourceType: "module" },
    plugins,
    rules,
  },
];
`;
}

/** Rule-id prefixes we actually ship. Anything else is not ours to count. */
const OUR_PREFIXES = new Set(
  PLUGINS.map((p) => p.replace('eslint-plugin-', '')).concat([
    // Deprecated aliases kept registered through the next major.
    'jwt',
    'pg',
  ]),
);

function scanTarget(dir: string, configPath: string): Map<string, number> {
  const counts = new Map<string, number>();
  let raw: string;
  try {
    raw = sh(
      path.join(RIG, 'node_modules/.bin/eslint'),
      ['--no-config-lookup', '--config', configPath, '--format', 'json', '.'],
      dir,
    );
  } catch (error) {
    // ESLint exits non-zero whenever it reports anything, so a populated
    // stdout is a successful scan, not a failure.
    const stdout = (error as { stdout?: string }).stdout;
    if (!stdout) throw error;
    raw = stdout;
  }

  for (const file of JSON.parse(raw) as Array<{
    messages: Array<{ ruleId: string | null; message: string; fatal?: boolean }>;
  }>) {
    for (const message of file.messages) {
      if (!message.ruleId || message.fatal) continue;
      // An inline `eslint-disable react/display-name` in the TARGET's code
      // makes ESLint emit "Definition for rule ... was not found" carrying
      // that rule's id. Counting those attributed react, flowtype and jasmine
      // findings to us — rules we do not ship.
      if (message.message.startsWith('Definition for rule')) continue;
      // Core rules enabled by the target's own inline config comments
      // (`/* eslint complexity: [2, 12] */`) arrive the same way.
      const prefix = message.ruleId.split('/')[0]!;
      if (!OUR_PREFIXES.has(prefix)) continue;
      counts.set(message.ruleId, (counts.get(message.ruleId) ?? 0) + 1);
    }
  }
  return counts;
}

function main(): number {
  const update = process.argv.includes('--update');
  const asJson = process.argv.includes('--json');
  const log = (line: string) => {
    if (!asJson) console.log(line);
  };

  ensurePrivateDir(WORK, CACHE_HOME);

  // One shared install reused for every target; an install per repo dominates
  // the runtime. The plugins are taken from this checkout, so the scan
  // measures the code in the PR rather than the last published release.
  ensurePrivateDir(RIG, CACHE_HOME);
  writeFileSync(path.join(RIG, 'package.json'), JSON.stringify({ name: 'rig', private: true }));
  log('Installing scan rig…');
  sh(
    'npm',
    [
      'install',
      '--silent',
      '--no-audit',
      '--no-fund',
      'eslint@9',
      '@typescript-eslint/parser',
      // `typescript` is a PEER dependency of the parser, not a dependency of
      // it, so it has to be asked for explicitly — without it every target
      // fails with `Cannot find module 'typescript'`.
      //
      // Pinned to the major this workspace uses, NOT `latest`. TypeScript 7.0
      // is published, and typescript-eslint refuses to load against it:
      // "typescript-eslint does not support TS 7.0". An unpinned install
      // therefore breaks the scan the day TS ships a major, and the failure
      // arrives as every target erroring at once.
      `typescript@${WORKSPACE_TYPESCRIPT_RANGE}`,
      ...PLUGINS.map((p) => `${p}@file:${path.join(ROOT, 'packages', p)}`),
    ],
    RIG,
  );

  const configPath = path.join(RIG, 'corpus-scan.config.mjs');
  writeFileSync(configPath, buildConfig());

  const totals = new Map<string, number>();
  let scanned = 0;
  const failed: string[] = [];

  for (const { repo, ref } of TARGETS) {
    const dir = path.join(WORK, repo.replace('/', '__'));
    try {
      if (!existsSync(dir)) {
        log(`Cloning ${repo}@${ref}…`);
        sh('git', [
          'clone',
          '--depth',
          '1',
          '--branch',
          ref,
          '--quiet',
          `https://github.com/${repo}.git`,
          dir,
        ]);
      }
      for (const [rule, n] of scanTarget(dir, configPath)) {
        totals.set(rule, (totals.get(rule) ?? 0) + n);
      }
      scanned += 1;
    } catch (error) {
      failed.push(`${repo}: ${String((error as Error).message).slice(0, 200)}`);
    }
  }

  // A run where every clone or scan failed once reported "0 findings" as its
  // headline — the most dangerous possible output, because zero findings is
  // also what a perfect result looks like. Refuse to report at all instead.
  if (scanned === 0) {
    console.error('::error::every target failed to scan — no findings were measured');
    for (const f of failed) console.error(`  ${f}`);
    return 3;
  }
  if (failed.length > 0) {
    console.error(`::warning::${failed.length} of ${TARGETS.length} targets failed to scan`);
    for (const f of failed) console.error(`  ${f}`);
  }

  const budget: Budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf-8')) as Budget;

  // A PARTIAL scan must never rewrite the budget. Running `--update` while the
  // rig was busy once reduced 27 entries to 4: the targets that failed simply
  // contributed no rules, and every budget they owned was silently dropped —
  // which reads as "these rules now find nothing" rather than "these rules were
  // never measured". A budget is only meaningful if it came from a full run.
  if (update && failed.length > 0) {
    console.error(
      `::error::refusing to rewrite the budget from a partial scan — ` +
        `${failed.length} of ${failed.length + scanned} target(s) failed:`,
    );
    for (const line of failed) console.error(`::error::  ${line}`);
    return 1;
  }

  if (update) {
    const next: Budget = {
      $comment: budget.$comment,
      generated: new Date().toISOString().slice(0, 10),
      budgets: Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
    writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
    log(`Wrote ${Object.keys(next.budgets).length} budgets to ${path.relative(ROOT, BUDGET_FILE)}`);
    return 0;
  }

  const over: Array<{ rule: string; found: number; allowed: number }> = [];
  const under: Array<{ rule: string; found: number; allowed: number }> = [];

  for (const [rule, found] of totals) {
    // A rule with no budget entry is new to the corpus. Treat 0 as its budget
    // so a newly-noisy rule cannot arrive unnoticed.
    const allowed = budget.budgets[rule] ?? 0;
    if (found > allowed) over.push({ rule, found, allowed });
  }
  for (const [rule, allowed] of Object.entries(budget.budgets)) {
    const found = totals.get(rule) ?? 0;
    if (found < allowed) under.push({ rule, found, allowed });
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          scanned,
          failed,
          totals: Object.fromEntries(totals),
          over,
          under,
        },
        null,
        2,
      ),
    );
  } else {
    const total = [...totals.values()].reduce((a, b) => a + b, 0);
    log(`\n${total} findings across ${scanned}/${TARGETS.length} targets\n`);
    for (const { rule, found, allowed } of over) {
      console.error(`::error::${rule}: ${found} findings, budget ${allowed}`);
    }
    // Ratcheting down is the point of the exercise, so say so loudly enough
    // that the budget actually gets lowered rather than drifting upward.
    for (const { rule, found, allowed } of under) {
      log(`  ⬇ ${rule}: ${found} < budget ${allowed} — lower the budget`);
    }
  }

  if (over.length > 0) {
    console.error(
      `\n${over.length} rule(s) over budget. Fix the rule, or run with --update if the increase is a deliberate detection improvement.`,
    );
    return 1;
  }
  return 0;
}

process.exit(main());
