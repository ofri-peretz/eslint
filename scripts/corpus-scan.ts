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
 *   tsx scripts/corpus-scan.ts --local     # scan the WORKING TREE, pre-release
 *
 * ## Two modes, and why the default is the published one
 *
 * By default this installs the PUBLISHED plugins, so a number here describes
 * what a consumer installing today gets. A fix on main does not move it until
 * it is released.
 *
 * `--local` installs the working tree instead, to answer the other question:
 * does what I am about to ship make things better or worse? It compares against
 * the SAME budgets, because the budget is the published baseline and the delta
 * against it is the whole point.
 *
 * `--local --update` is refused. The budget describes shipped behaviour, and
 * letting a local run rewrite it would let an unreleased fix claim credit — the
 * exact confusion the two modes exist to keep apart.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { SCAN_IGNORES } from './lib/corpus-scan-ignores.ts';
import { ensurePrivateDir, resolveCacheHome } from './lib/private-cache-dir.ts';

/**
 * Plugins whose rules apply to server and library code.
 *
 * Batch 1 of the rule re-review (.agent/RULE-REVIEW-BATCHES.md) adds
 * `reliability`. The gate had covered five SECURITY plugins, which is 0.3% of
 * what a user actually sees — `reliability` alone is 57%.
 */
const PLUGINS = [
  'eslint-plugin-secure-coding',
  'eslint-plugin-node-security',
  'eslint-plugin-browser-security',
  'eslint-plugin-jwt-security',
  'eslint-plugin-express-security',
  'eslint-plugin-reliability',
  'eslint-plugin-import-next',
  'eslint-plugin-conventions',
  'eslint-plugin-maintainability',
  'eslint-plugin-modernization',
  'eslint-plugin-operability',
  'eslint-plugin-modularity',
  'eslint-plugin-react-a11y',
  'eslint-plugin-react-features',
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
// Resolved 2026-08-20 from each repository's default branch. The comment above
// has said "pinned to a commit, not a branch" since this file was written, and
// the list said `master` / `main` — so the corpus moved under the ratchet, and
// every upstream refactor arrived looking exactly like a rule regression. That
// is the failure the comment predicts, and it is why eight rules sat over
// budget with no rule change to explain them.
//
// Advancing a pin is now a deliberate commit that shows up in review, which is
// the same standard `--update` already applies to the budget itself.
const TARGETS: ReadonlyArray<{ repo: string; ref: string }> = [
  {
    repo: 'okta/okta-auth-js',
    ref: '17efe6a87db904c7bf8de9abb8e5961580f6a30c',
  },
  {
    repo: 'auth0/express-openid-connect',
    ref: '94a08dd6c214a5a427a70110898e0e2099e5daab',
  },
  { repo: 'stripe/stripe-js', ref: '16f79edb92e1e74c8da01c975cf85520b8f14c5b' },
  {
    repo: 'twilio/twilio-node',
    ref: 'c8a4c27de84ec3838726da878cb9ca04a438ec59',
  },
  { repo: 'redis/ioredis', ref: 'c0cd66cad8bc3d6fb02e2021f32ae2a88506ee97' },
  {
    repo: 'paypal/paypal-checkout-components',
    ref: '861ab38f819840054eaed903bfc1ce32eb9b535f',
  },
  {
    repo: 'okta/okta-signin-widget',
    ref: '0fec2f240ae83e5303c2e5e822989e7f82a3eaec',
  },
  { repo: 'Shopify/cli', ref: 'cdcb458232c1482f13ae502b72112afb827f9135' },
];

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Rules that cannot be measured against a bare clone, and what fixes each.
 *
 * The targets are shallow git clones. Without `--install-targets` they are
 * never `npm install`ed and never built, so any rule whose verdict depends on
 * the dependency tree is answering a question about the clone rather than about
 * the rule.
 *
 * `--install-targets` closes the dependency half. Measured on the pinned
 * corpus, `no-unresolved` splits almost evenly:
 *
 *   4,374 (49%)  BARE specifiers — `find-up`, `fs-extra`, `fast-glob`. Nothing
 *                but a missing `node_modules`. On auth0/express-openid-connect
 *                the count went 86 -> 0 once the target was installed.
 *   4,530 (51%)  RELATIVE specifiers, 4,451 of them in Shopify/cli, almost all
 *                `./types.js` — which graphql-codegen writes at BUILD time.
 *
 * So an install is not enough for the second half, and building eight
 * third-party repositories is a different and much heavier piece of work. That
 * half stays excluded, and it is excluded for an honest reason: in a fresh
 * checkout `./types.js` really is absent, so the finding describes the
 * environment rather than the rule. `eslint-plugin-import` behaves the same way.
 *
 * A budget would be worse than an exclusion for the un-installed case: the
 * number would look like a quality signal, and it would drift whenever a pinned
 * SHA moves for reasons that have nothing to do with the rule.
 *
 * `no-extraneous-dependencies` USED to be in this set and never belonged.
 * It compares imports against `package.json`, not against the installed tree,
 * so it never needed a `node_modules` at all — measured on
 * auth0/express-openid-connect, it reports the same 10 findings before and
 * after an install. It was excluded by association with `no-unresolved`, and
 * 3,147 findings were invisible to this gate for no reason. It is budgeted now.
 *
 * Worth stating plainly because the exclusion was argued at length in this very
 * comment and the argument was still wrong: an exclusion needs the same
 * evidence as a budget, and "it is about dependencies" is a name, not a
 * measurement.
 */
const DEPENDENCY_DEPENDENT_RULES: ReadonlySet<string> = new Set([
  'import-next/no-unresolved',
]);

/**
 * What THIS run cannot speak to.
 *
 * Keyed on whether the targets are actually installed, not on whether the flag
 * was passed. The two diverge: `node_modules` from an earlier `--install-targets`
 * run survives in the shared cache, so a later run without the flag still
 * resolves every specifier while claiming it could not. That is the same shape
 * as the stale-rig defect — a number that depends on cache state nobody
 * declared — and it would be a strange one to reintroduce in the change that
 * exists to make these rules measurable.
 */
function unmeasurableRules(targetsInstalled: boolean): ReadonlySet<string> {
  return targetsInstalled ? new Set<string>() : DEPENDENCY_DEPENDENT_RULES;
}

/**
 * The EXACT version of a rig dependency, read from the workspace lockfile.
 *
 * The rig had no lockfile of its own and installed `eslint@9`,
 * `@typescript-eslint/parser` and `oxc-resolver` unpinned, so every install was
 * free to resolve differently — and did. CI read this corpus at 14,996, 15,003
 * and 15,361 findings on the same commit, and `hooks-exhaustive-deps` at both
 * 84 and 91 on clean builds. A budget cannot mean anything against a moving
 * environment.
 *
 * Pinning to the LOCKFILE rather than to a range also fixes a second thing: the
 * scan was measuring the plugins under ESLint 9 while the repository builds and
 * tests them under 10. The gate now measures what the repo actually ships
 * against.
 */
// NOTE: `WORKSPACE_TYPESCRIPT_RANGE` and `RECHECK_RANGE` lived here and derived
// a RANGE from package.json. `lockedVersion` supersedes both — a range still
// lets npm resolve differently between installs, which is the whole defect this
// change fixes — so they are gone rather than left as a second way to pin.

function lockedVersion(name: string): string {
  const lock = JSON.parse(
    readFileSync(path.join(ROOT, 'package-lock.json'), 'utf-8'),
  ) as {
    packages: Record<string, { version?: string } | undefined>;
  };
  const version = lock.packages[`node_modules/${name}`]?.version;
  if (!version) {
    throw new Error(
      `no resolved version for ${name} in package-lock.json — cannot pin the scan rig`,
    );
  }
  return version;
}

/**
 * The version of a plugin this gate measures: the one in its package.json.
 *
 * That is the version most recently released, because changesets bumps it at
 * release time. So the gate reports what a consumer installing today would see
 * — and a fix landing on main does NOT move these numbers until it ships,
 * which is the honest reading and the reason this is not a `file:` dependency.
 *
 * A version that is not on npm yet is a hard failure rather than a silent
 * fallback to `latest`: measuring a different version than the one named is
 * exactly the staleness this change exists to remove.
 */
/**
 * A content hash of everything a plugin's `dist` would ship.
 *
 * Not mtime, and not one entry point. `dist/src/index.js` is a BARREL — it
 * contains no rule code at all, so editing a rule and rebuilding leaves it
 * byte-identical, and a fingerprint reading it would call the rig fresh while
 * npm served the previous build from cache. That is the same staleness that
 * made no-magic-numbers read 1,635 against a fresh 1,421, arriving for the
 * third time by a different route.
 *
 * mtime is no better on its own: it is metadata, it does not identify bytes,
 * and plenty of tooling preserves it. Hashing the contents is the only version
 * of this that answers the question actually being asked — is the code in this
 * directory the code the rig was built from.
 */
function distHash(plugin: string): string {
  const dist = path.join(ROOT, 'packages', plugin, 'dist');
  if (!existsSync(dist)) return 'absent';
  const hash = createHash('sha1');
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      // LENGTH-DELIMITED, so the concatenation is unambiguous. Feeding path
      // and contents in raw lets a file named `a` holding `a` hash identically
      // to a file named `aa` holding nothing — verified, both e0c9035898dd52fc.
      // Every record is therefore prefixed with its own byte length.
      //
      // Path as well as contents: a file moving is a change too.
      const relative = Buffer.from(path.relative(dist, full));
      const contents = readFileSync(full);
      const lengths = Buffer.alloc(8);
      lengths.writeUInt32BE(relative.byteLength, 0);
      lengths.writeUInt32BE(contents.byteLength, 4);
      hash.update(lengths);
      hash.update(relative);
      hash.update(contents);
    }
  };
  walk(dist);
  return hash.digest('hex').slice(0, 16);
}

function publishedVersion(plugin: string): string {
  const pkg = JSON.parse(
    readFileSync(path.join(ROOT, 'packages', plugin, 'package.json'), 'utf-8'),
  ) as { version?: string };
  if (!pkg.version) throw new Error(`${plugin} has no version in package.json`);
  return pkg.version;
}

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
/**
 * npm's cache, private to the rig.
 *
 * In local mode `--install-links` packs each `file:` dependency into a tarball
 * keyed `name@version`, and a rebuild does not bump the version — so the shared
 * cache happily serves the previous build. Keeping the cache beside the rig
 * means the rebuild path can drop it without touching the developer's own.
 */
const NPM_CACHE = path.join(WORK, '_npm-cache');

interface Budget {
  /** Human note; ignored by the checker. */
  $comment: string;
  /** ISO date the numbers were last regenerated. */
  generated: string;
  /** rule id -> maximum findings tolerated across the whole corpus. */
  budgets: Record<string, number>;
  /** Why each budget above is allowed. Preserved verbatim across `--update`. */
  triage?: Record<string, string>;
}

/**
 * npm registry propagation is not instant, and this scan installs the versions
 * a release *just published*.
 *
 * Every open PR runs `Scan pinned corpus`, and it resolves the published plugin
 * versions from the lockfile. Publish six packages and, for the minute or two
 * before the registry serves them everywhere, that install 404s — so a green
 * release turns the whole PR queue red at once. Observed five times in one
 * evening; every pinned dependency resolved by hand minutes later.
 *
 * The cost of no retry is not the red run, it is the habit: a required check
 * that cries wolf gets re-run reflexively, and the day it fails for a real
 * reason — a corpus regression, a genuinely missing version — nobody reads it.
 *
 * Deliberately narrow. Only a *resolution* failure is retried, because that is
 * the one with a known transient cause. A dependency conflict, a bad lockfile
 * or an ENOSPC fails on the first attempt exactly as before; retrying those
 * would be the wolf-crying this exists to prevent.
 */
const REGISTRY_PROPAGATION_RETRIES = 3;
const REGISTRY_RETRY_DELAY_MS = 10_000;

/** Does this npm failure look like "published, not visible yet"? */
function looksLikePropagationLag(output: string): boolean {
  return (
    /\bE404\b/.test(output) ||
    /No matching version found for/i.test(output) ||
    /is not in this registry/i.test(output) ||
    /ETARGET/.test(output)
  );
}

/** `sh`, retried only while npm says it cannot yet see a version. */
function shWithRegistryRetry(
  cmd: string,
  args: string[],
  cwd?: string,
): string {
  for (let attempt = 1; ; attempt++) {
    try {
      return sh(cmd, args, cwd);
    } catch (error) {
      const err = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const output = `${err.stdout ?? ''}${err.stderr ?? ''}${err.message ?? ''}`;
      if (
        attempt >= REGISTRY_PROPAGATION_RETRIES ||
        !looksLikePropagationLag(output)
      ) {
        throw error;
      }
      log(
        `  npm could not resolve a pinned version (attempt ${attempt}/${REGISTRY_PROPAGATION_RETRIES}). ` +
          `A release may still be propagating; retrying in ${REGISTRY_RETRY_DELAY_MS / 1000}s.`,
      );
      Atomics.wait(
        new Int32Array(new SharedArrayBuffer(4)),
        0,
        0,
        REGISTRY_RETRY_DELAY_MS,
      );
    }
  }
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
    // Sourced from scripts/lib/corpus-scan-ignores.ts, which carries the
    // reason for every entry and is importable by a test without running a scan.
    ignores: ${JSON.stringify(SCAN_IGNORES)},
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
    messages: Array<{
      ruleId: string | null;
      message: string;
      fatal?: boolean;
    }>;
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

/**
 * Install one target's dependencies, so a rule that asks "does this specifier
 * resolve" can be answered about the RULE rather than about the clone.
 *
 * `--ignore-scripts` is not optional. These are eight third-party repositories
 * pinned by SHA; a lifecycle script in any of them, or in anything they depend
 * on, would execute with the privileges of whoever runs the scan. Nothing here
 * needs a build step to run, so there is no reason to hand one an interpreter.
 *
 * `--legacy-peer-deps` because several targets predate npm 7's peer resolution
 * and would otherwise fail outright; `--no-audit --no-fund` because neither
 * says anything about the measurement.
 *
 * A target that fails to install is left alone rather than aborted on. Some of
 * these repositories are pnpm or yarn workspaces and npm cannot always
 * reproduce their tree — the scan still has something true to say about the
 * rules that do not depend on it, and the summary reports which targets are
 * partial.
 */
function installTargetDependencies(dir: string, repo: string): void {
  if (existsSync(path.join(dir, 'node_modules'))) return;
  if (!existsSync(path.join(dir, 'package.json'))) return;
  log(`Installing dependencies for ${repo}…`);
  try {
    sh(
      'npm',
      [
        'install',
        // See the note above: never negotiable.
        '--ignore-scripts',
        '--legacy-peer-deps',
        '--no-audit',
        '--no-fund',
        '--silent',
      ],
      dir,
    );
  } catch {
    console.error(
      `::warning::${repo} failed to install; its dependency-dependent findings describe the clone, not the rule.`,
    );
  }
}

function main(): number {
  const update = process.argv.includes('--update');
  const local = process.argv.includes('--local');
  // Install each target's dependencies before scanning it. Off by default: it
  // costs minutes and gigabytes, and the default gate runs on every PR.
  const installTargets = process.argv.includes('--install-targets');
  if (local && update) {
    console.error(
      '::error::--local --update is refused. The budget records PUBLISHED behaviour; a\n' +
        'working-tree run must not rewrite it, or an unreleased fix takes credit for a\n' +
        'number no consumer can see. Release the fix, then --update.',
    );
    return 2;
  }
  const asJson = process.argv.includes('--json');
  const log = (line: string) => {
    if (!asJson) console.log(line);
  };

  ensurePrivateDir(WORK, CACHE_HOME);

  // One shared install reused for every target; an install per repo dominates
  // the runtime. The plugins are taken from this checkout, so the scan
  // measures the code in the PR rather than the last published release.
  ensurePrivateDir(RIG, CACHE_HOME);
  writeFileSync(
    path.join(RIG, 'package.json'),
    JSON.stringify({ name: 'rig', private: true }),
  );
  // Wipe the rig when the set of versions under test changes.
  //
  // The rig installs the PUBLISHED plugins, so what it measures is what users
  // actually get — not the working tree. That is the point: a number from this
  // gate describes shipped behaviour, and a fix does not move it until the fix
  // is released.
  //
  // It also removes the whole class of staleness that cost most of today. A
  // `file:` dependency is served from npm's cache when its version has not
  // changed, so the rig kept measuring a PREVIOUS local build: no-magic-numbers
  // read 1,635 against a fresh 1,421, and hooks-exhaustive-deps read both 84
  // and 91. A published version is immutable, so the same version string is
  // always the same code.
  // In published mode the version string IS the identity of the code. In local
  // mode it is not — the version does not change when you rebuild — so the
  // fingerprint has to read the built artifact, or npm serves the previous
  // build out of its cache and the run silently measures stale code.
  //
  // `@interlace/eslint-devkit` is in the local fingerprint, and leaving it out
  // was a live defect. Every plugin's dist requires the devkit at runtime, and
  // `--install-links` COPIES rather than symlinks, so the rig holds a snapshot
  // of it. Hashing only the plugins meant a devkit-only change left the rig
  // stamped unchanged and the copy stale. Adding an export surfaced it loudly
  // — `isGeneratedFile is not a function`, on 8 of 8 repositories — but the
  // ordinary case is silent: change a shared predicate, and the scan measures
  // the previous one while reporting a number against the new code.
  const fingerprint = [
    ...PLUGINS.map((plugin) =>
      local
        ? `${plugin}:local:${distHash(plugin)}`
        : `${plugin}@${publishedVersion(plugin)}`,
    ),
    ...(local ? [`eslint-devkit:local:${distHash('eslint-devkit')}`] : []),
  ].join('\n');
  const stampFile = path.join(RIG, '.plugin-fingerprint');
  if (
    existsSync(path.join(RIG, 'node_modules')) &&
    (!existsSync(stampFile) || readFileSync(stampFile, 'utf-8') !== fingerprint)
  ) {
    log('Plugin versions changed — rebuilding the scan rig…');
    rmSync(path.join(RIG, 'node_modules'), { recursive: true, force: true });
    rmSync(path.join(RIG, 'package-lock.json'), { force: true });
    // And npm's own cache for this rig. Deleting node_modules is not enough in
    // LOCAL mode: `--install-links` packs each `file:` dependency into a
    // tarball that npm caches under `name@version`, and a rebuild does not
    // change the version. So the reinstall unpacked the PREVIOUS build of the
    // devkit while the stamp said the rig was fresh — the exact staleness the
    // fingerprint above exists to prevent, one layer further down.
    //
    // A private cache directory rather than `npm cache clean --force`, which
    // would throw away the developer's whole cache to fix the rig's.
    rmSync(NPM_CACHE, { recursive: true, force: true });
  }

  log(
    local
      ? 'Installing scan rig — LOCAL WORKING TREE (not shipped behaviour)…'
      : 'Installing scan rig — published plugin versions…',
  );
  shWithRegistryRetry(
    'npm',
    [
      'install',
      // Only meaningful for `--local`, where the plugins are `file:` deps: copy
      // them instead of symlinking, so the rig is a snapshot of the tree as it
      // stood. Harmless otherwise.
      ...(local ? ['--install-links'] : []),
      // Scoped to the rig, so wiping it above cannot touch anything else.
      '--cache',
      NPM_CACHE,
      // The rig pins FROM this repo's package-lock.json, so it must resolve
      // the way this repo resolves — and the root `.npmrc` sets
      // `legacy-peer-deps=true`. The rig installs into `_rig`, outside the
      // repo, where that .npmrc does not apply, so npm enforced peer ranges
      // the workspace itself does not and the install died on ERESOLVE:
      //
      //   eslint@10.9.1 (locked) vs @typescript-eslint/parser@8.54.0, whose
      //   peer range is ^8.57.0 || ^9.0.0 — ESLint 10 is not in it.
      //
      // Nothing about the rig changed; ESLint went to 10 in the workspace and
      // the rig was the only place the pre-existing peer violation was
      // visible. Parser 8.68.0 widens the range to include ^10.0.0, so the
      // durable fix is bumping the workspace's parser — filed separately
      // rather than folded into a scan fix, since it moves a dependency every
      // rule test parses with.
      '--legacy-peer-deps',
      '--silent',
      '--no-audit',
      '--no-fund',
      `eslint@${lockedVersion('eslint')}`,
      `@typescript-eslint/parser@${lockedVersion('@typescript-eslint/parser')}`,
      // `typescript` is a PEER dependency of the parser, not a dependency of
      // it, so it has to be asked for explicitly — without it every target
      // fails with `Cannot find module 'typescript'`.
      //
      // Pinned to the major this workspace uses, NOT `latest`. TypeScript 7.0
      // is published, and typescript-eslint refuses to load against it:
      // "typescript-eslint does not support TS 7.0". An unpinned install
      // therefore breaks the scan the day TS ships a major, and the failure
      // arrives as every target erroring at once.
      `typescript@${lockedVersion('typescript')}`,
      // The ReDoS ORACLE. `recheck` is an OPTIONAL peer of
      // eslint-plugin-secure-coding, and `confirmsRedos` FAILS OPEN when it is
      // absent — so a rig without it reports every scslre finding unvetoed and
      // the numbers describe a rule running with half its machinery.
      //
      // Discovered 2026-08-20: this rig had never installed it, so the ReDoS
      // budget of 6 (and the 7 that replaced it) were both measured with no
      // oracle at all. An optional dependency that changes the answer is not
      // optional to the measurement.
      //
      // Pinned, for the same reason every other rig dependency is: the oracle
      // decides findings, so an unpinned one lets a `recheck` release restate
      // published corpus numbers without a commit here.
      `recheck@${lockedVersion('recheck')}`,
      // The import RESOLVER. `oxc-resolver` is an OPTIONAL peer of
      // @interlace/eslint-devkit, and `no-unresolved` / `named` / `default` /
      // `namespace` cannot answer anything without it.
      //
      // Unlike the ReDoS oracle this one fails CLOSED — `loadResolverFactory`
      // throws MissingResolverPeerError rather than quietly returning "not
      // resolved" — so its absence surfaces as every target erroring instead
      // of as a silently perfect score. Installed for the same reason all the
      // same: an optional dependency that changes the answer is not optional
      // to the measurement.
      `oxc-resolver@${lockedVersion('oxc-resolver')}`,
      ...PLUGINS.map((p) =>
        local
          ? `${p}@file:${path.join(ROOT, 'packages', p)}`
          : `${p}@${publishedVersion(p)}`,
      ),
      // The devkit, from the working tree, in LOCAL mode only.
      //
      // Without this line `--local` did not measure the local tree. Every
      // plugin declares `@interlace/eslint-devkit` as a SEMVER RANGE
      // (`^1.11.0`), so npm resolved it from the registry and the rig ran
      // local plugins against the PUBLISHED devkit. Everything that lives
      // there — `isTestFilePath`, `createRule`'s skip flags, every shared
      // detector — was therefore measured at whatever was last released,
      // while the report said "local working tree".
      //
      // It surfaced as `isGeneratedFile is not a function` on 8 of 8 targets
      // only because the change added a NEW export. A change to an EXISTING
      // one is silent: the scan runs, produces a number, and the number
      // describes code that is not in the tree.
      //
      // In published mode this is correctly absent — there the plugins' own
      // dependency ranges are part of what is being measured.
      // `packages/eslint-devkit/dist`, not the package root. The two publish
      // differently: a plugin's `files` lists both `src/` and `dist/`, so
      // packing its root yields a working tarball, while the devkit's lists
      // only `src/` even though its `main` is `./dist/src/index.js`. The devkit
      // is published FROM `dist/`, which carries its own package.json pointing
      // at `./src/index.js`. Packing the root instead gives a tarball whose
      // entry point is not in it.
      ...(local
        ? [
            `@interlace/eslint-devkit@file:${path.join(ROOT, 'packages', 'eslint-devkit', 'dist')}`,
          ]
        : []),
    ],
    RIG,
  );

  // Record what this rig was built from, so the next run can tell.
  writeFileSync(stampFile, fingerprint);

  const configPath = path.join(RIG, 'corpus-scan.config.mjs');
  writeFileSync(configPath, buildConfig());

  const totals = new Map<string, number>();
  let scanned = 0;
  // Every target has to be installed for the dependency-dependent rules to mean
  // anything. One bare clone is enough to make the total describe the clone.
  let targetsInstalled = true;
  const failed: string[] = [];

  for (const { repo, ref } of TARGETS) {
    const dir = path.join(WORK, repo.replace('/', '__'));
    try {
      // `git clone --branch` takes a branch or tag, never a SHA, so a pinned
      // commit needs init + fetch. Kept shallow: one commit, no history.
      //
      // The cached clone is also VERIFIED against the pin rather than trusted.
      // Reusing whatever `dir` happens to hold is how a scan silently measures
      // the wrong code — the cache survives a pin change, and the run would
      // report numbers for the old commit under the new pin's name.
      const headMatches = (): boolean => {
        if (!existsSync(path.join(dir, '.git'))) return false;
        try {
          return sh('git', ['-C', dir, 'rev-parse', 'HEAD']).trim() === ref;
        } catch {
          return false;
        }
      };
      if (!headMatches()) {
        if (existsSync(dir)) {
          log(`Cached ${repo} is not at ${ref.slice(0, 8)} — refetching…`);
          rmSync(dir, { recursive: true, force: true });
        }
        log(`Fetching ${repo}@${ref.slice(0, 8)}…`);
        // Through the hardening, not a bare mkdirSync — `private-cache-dir`
        // rejects a relative path or one inside the shared tmpdir, and the
        // scratch-space lock test asserts every directory here goes via it.
        ensurePrivateDir(dir, CACHE_HOME);
        sh('git', ['-C', dir, 'init', '--quiet']);
        sh('git', [
          '-C',
          dir,
          'remote',
          'add',
          'origin',
          `https://github.com/${repo}.git`,
        ]);
        sh('git', [
          '-C',
          dir,
          'fetch',
          '--depth',
          '1',
          '--quiet',
          'origin',
          ref,
        ]);
        sh('git', ['-C', dir, 'checkout', '--quiet', 'FETCH_HEAD']);
      }
      if (installTargets) installTargetDependencies(dir, repo);
      if (!existsSync(path.join(dir, 'node_modules'))) targetsInstalled = false;
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
    console.error(
      '::error::every target failed to scan — no findings were measured',
    );
    for (const f of failed) console.error(`  ${f}`);
    return 3;
  }
  if (failed.length > 0) {
    console.error(
      `::warning::${failed.length} of ${TARGETS.length} targets failed to scan`,
    );
    for (const f of failed) console.error(`  ${f}`);
  }

  // Decided AFTER the loop, from what the targets actually hold. See
  // `unmeasurableRules` for why the flag alone is not enough.
  const unmeasurable = unmeasurableRules(targetsInstalled);
  if (targetsInstalled && !installTargets) {
    log(
      'Targets already carry node_modules from an earlier --install-targets run;\n' +
        'the dependency-dependent rules are being measured accordingly.',
    );
  }

  // A budget written against a state the default gate cannot reproduce is not a
  // budget. `node_modules` survives in the shared cache, so a developer who ran
  // `--install-targets` once would otherwise write `no-unresolved: 2630` into a
  // file CI evaluates against bare clones — where the same rule reports
  // thousands. Same refusal, and same reason, as `--local --update`.
  if (update && targetsInstalled !== installTargets) {
    console.error(
      `::error::--update refused. The targets are ${targetsInstalled ? '' : 'not '}installed ` +
        `while --install-targets was ${installTargets ? '' : 'not '}passed, so this run measures ` +
        'a state the next one will not reproduce. Pass the flag, or clear the ' +
        'targets\u2019 node_modules, so the two agree.',
    );
    return 2;
  }

  const budget: Budget = JSON.parse(
    readFileSync(BUDGET_FILE, 'utf-8'),
  ) as Budget;

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
    // `triage` is carried forward explicitly. It is the recorded REASON for
    // every budget entry — the only place a "why is this allowed" answer
    // lives — and rebuilding the object from scratch silently dropped all of
    // it. Found 2026-08-21 when a single `--update` erased eight entries that
    // had taken a day to write.
    const next: Budget = {
      $comment: budget.$comment,
      generated: new Date().toISOString().slice(0, 10),
      budgets: Object.fromEntries(
        [...totals.entries()]
          .filter(([rule]) => !unmeasurable.has(rule))
          .sort(([a], [b]) => a.localeCompare(b)),
      ),
      ...(budget.triage ? { triage: budget.triage } : {}),
    };
    writeFileSync(BUDGET_FILE, `${JSON.stringify(next, null, 2)}\n`);
    log(
      `Wrote ${Object.keys(next.budgets).length} budgets to ${path.relative(ROOT, BUDGET_FILE)}`,
    );
    return 0;
  }

  const over: Array<{ rule: string; found: number; allowed: number }> = [];
  const under: Array<{ rule: string; found: number; allowed: number }> = [];

  for (const [rule, found] of totals) {
    // Skipped, not budgeted at zero — see DEPENDENCY_DEPENDENT_RULES.
    if (unmeasurable.has(rule)) continue;
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
    //
    // In local mode the same fact means something different: the budget is the
    // PUBLISHED baseline, so under-budget is an unreleased improvement and
    // lowering the budget now would credit a number no consumer can see.
    for (const { rule, found, allowed } of under) {
      log(
        local
          ? `  ⬇ ${rule}: ${found} vs ${allowed} published — an improvement, ratchet it after release`
          : `  ⬇ ${rule}: ${found} < budget ${allowed} — lower the budget`,
      );
    }
  }

  if (over.length > 0) {
    console.error(
      local
        ? `\n${over.length} rule(s) report MORE than the published version does. Either the\nchange regresses them, or the increase is a deliberate detection improvement —\nsay which in the commit, because --local cannot rewrite the budget.`
        : `\n${over.length} rule(s) over budget. Fix the rule, or run with --update if the increase is a deliberate detection improvement.`,
    );
    return 1;
  }
  return 0;
}

process.exit(main());
