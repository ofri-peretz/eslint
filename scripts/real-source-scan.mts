/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * real-source-scan.ts — which rules fire on code we did not write.
 *
 * ## Why this exists as a script and not as a number
 *
 * `benchmarks/budgets/real-world-rule-inventory.json` claimed 158 repositories
 * and 13,146 files, and no script in the repository could produce it again.
 * The repository list was never committed; only 69 of the 158 names survive, in
 * the two-sample-per-rule field. A measurement nobody can re-run is a claim,
 * and this suite has already been bitten three times by instruments that
 * reported health while broken.
 *
 * So: the repository list is data (`benchmarks/real-source-repos.json`), the
 * scan is code, and the output says which of the two it came from.
 *
 * ## What the number does and does not mean
 *
 * A rule that fires here has been shown a candidate by a stranger's codebase.
 * It has NOT been shown to be right — `secure-coding/no-insecure-comparison`
 * accounts for 12,303 findings and most are `===` on two config values. The
 * conclusive direction is the other one: a rule that produces nothing across
 * thousands of files of real code has never had the chance to be right, and no
 * amount of self-authored fixtures changes that.
 *
 *   npx tsx scripts/real-source-scan.mts            # clone (as needed) and lint
 *   npx tsx scripts/real-source-scan.mts --no-clone # lint whatever is cached
 */

import { execFileSync, fork } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CACHE = path.join(ROOT, 'benchmarks', '.real-source-cache');
const REPOS = path.join(ROOT, 'benchmarks', 'real-source-repos.json');
const OUT = path.join(ROOT, 'benchmarks', 'budgets', 'real-world-rule-inventory.json');
const NO_CLONE = process.argv.includes('--no-clone');

/**
 * `--shard i/n` makes this process lint only its slice and print the result as
 * JSON on stdout. Without it the process is the COORDINATOR: it forks one
 * worker per core and merges what they send back.
 *
 * Not premature. Linting 346,837 files with 566 rules and a TypeScript parser
 * ran at roughly one file per second single-threaded — 96 hours. The work is
 * embarrassingly parallel (no file's result depends on another's) and the
 * machine has cores sitting idle, so the only reason it was serial is that
 * nobody had measured it.
 */
const shardArg = process.argv.find((a) => a.startsWith('--shard='))?.slice('--shard='.length);
const SHARD = shardArg ? { index: Number(shardArg.split('/')[0]), of: Number(shardArg.split('/')[1]) } : null;

/**
 * Files large enough that they are certainly generated — a bundle, a minified
 * vendor drop, a checked-in lockfile-shaped data module. 186 of them across the
 * corpus, and 8.8% of all bytes. A finding in one says nothing about the rule,
 * and reading them costs more than every other file put together.
 */
const MAX_FILE_BYTES = 200_000;

/**
 * A bundle is not somebody's source, whatever its size.
 *
 * `assets/uswds/js/uswds.js` is 180KB of concatenated vendor code, under the
 * byte cap and responsible for the top four samples of the three
 * highest-volume rules. Machine-packed output announces itself in its line
 * lengths rather than its path — `dist/` and `vendor/` are conventions a
 * stranger's repository is free to ignore.
 */
const MAX_LINE_CHARS = 2_000;
function looksGenerated(file: string): boolean {
  let head: string;
  try {
    head = fs.readFileSync(file, 'utf8').slice(0, 200_000);
  } catch {
    return true;
  }
  if (/^\s*(\/\/|\/\*)[^\n]*(@generated|DO NOT EDIT|auto-generated)/im.test(head.slice(0, 2_000))) return true;
  return head.split('\n').some((line) => line.length > MAX_LINE_CHARS);
}
const STAMP = new Date().toISOString().slice(0, 10);

const { repos } = JSON.parse(fs.readFileSync(REPOS, 'utf8')) as { repos: string[] };

/**
 * Every rule the suite ships, by the SAME rule as `rule-case-ledger.ts`: the
 * generated manifest intersected with the modules actually on disk. Two
 * instruments answering "how many rules do we have" must agree, or one of them
 * is quietly measuring something else — the manifest alone says 475 because it
 * still lists five rules whose files are gone.
 */
function allRules(): string[] {
  const pkgDir = path.join(ROOT, 'packages');
  const manifest = JSON.parse(
    fs.readFileSync(path.join(ROOT, '.agent', 'plugin-rule-manifest.json'), 'utf8'),
  ) as Record<string, Record<string, unknown>>;
  const onDisk = new Set<string>();
  for (const pkg of fs.readdirSync(pkgDir).filter((d) => d.startsWith('eslint-plugin-'))) {
    const rulesDir = path.join(pkgDir, pkg, 'src', 'rules');
    if (!fs.existsSync(rulesDir)) continue;
    const plugin = pkg.replace('eslint-plugin-', '');
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(full, 'index.ts'))) onDisk.add(`${plugin}/${entry.name}`);
          walk(full);
        } else if (entry.name.endsWith('.ts') && !/\.(test|spec)\./.test(entry.name) && entry.name !== 'index.ts') {
          onDisk.add(`${plugin}/${entry.name.replace(/\.ts$/, '')}`);
        }
      }
    };
    walk(rulesDir);
  }
  const out: string[] = [];
  for (const [pkg, rules] of Object.entries(manifest)) {
    if (!fs.existsSync(path.join(pkgDir, pkg))) continue;
    for (const name of Object.keys(rules)) {
      const id = `${pkg.replace('eslint-plugin-', '')}/${name}`;
      if (onDisk.has(id)) out.push(published(id));
    }
  }
  return [...new Set(out)].sort();
}

/**
 * Two plugins publish under a prefix that differs from their directory, so a
 * ruleId ESLint reports will not match the directory-derived name. Without
 * this every `jwt/` and `pg/` finding was filed as "not ours" and dropped —
 * 26 rules reported as never scanned when they had simply been discarded.
 */
function published(rule: string): string {
  const aliases: Record<string, string> = { 'jwt-security/': 'jwt/', 'postgresql-security/': 'pg/' };
  for (const [dir, id] of Object.entries(aliases)) {
    if (rule.startsWith(dir)) return id + rule.slice(dir.length);
  }
  return rule;
}

fs.mkdirSync(CACHE, { recursive: true });

let cloned = 0;
let missing = 0;
if (!NO_CLONE) {
  for (const repo of repos) {
    const dir = path.join(CACHE, repo.replace('/', '__'));
    if (fs.existsSync(dir)) continue;
    try {
      execFileSync('git', ['clone', '--depth', '1', '--quiet', `https://github.com/${repo}.git`, dir], {
        stdio: 'ignore',
        timeout: 180_000,
      });
      cloned += 1;
    } catch {
      // A repository can be renamed, archived or made private between runs.
      // Recording it as missing is the honest outcome; failing the whole scan
      // because one of 75 moved would make the measurement impossible to keep.
      missing += 1;
      fs.rmSync(dir, { recursive: true, force: true });
      console.error(`  unreachable: ${repo}`);
    }
  }
}

const present = repos.filter((r) => fs.existsSync(path.join(CACHE, r.replace('/', '__'))));
// stdout carries the shard's JSON result and nothing else; a worker's progress
// goes to stderr, which the parent inherits.
const say = (line: string): void => {
  if (SHARD === null) console.log(line);
};
say(`  ${present.length} repositories cached (${cloned} newly cloned, ${missing} unreachable)\n`);
if (present.length === 0) {
  console.error('  nothing to scan');
  process.exit(1);
}

/**
 * The same exclusions the other real-source instruments use. They diverged once
 * and the divergence was invisible: one walker skipped `docs/` and `examples/`
 * and the other did not, so the two disagreed about the same rule on the same
 * repository. Vendored and generated output is excluded because a finding in a
 * minified bundle says nothing about the rule.
 */
const SKIP_DIR =
  /(^|\/)(node_modules|dist|build|out|\.next|\.nuxt|coverage|vendor|third_party|\.git|flow-typed)(\/|$)/;
const SKIP_FILE = /(\.(min|bundle|chunk)\.[cm]?jsx?)$/;

const files: string[] = [];
const walk = (dir: string): void => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(`/${path.relative(CACHE, full)}/`)) walk(full);
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name) && !SKIP_FILE.test(entry.name)) {
      files.push(full);
    }
  }
};
for (const repo of present) walk(path.join(CACHE, repo.replace('/', '__')));

// Sorted so every shard sees the same list, and so a re-run splits it the same
// way. `readdir` order is not guaranteed stable across machines.
files.sort();
const oversized = files.filter((f) => {
  try {
    if (fs.statSync(f).size > MAX_FILE_BYTES) return true;
  } catch {
    return true;
  }
  return looksGenerated(f);
});
const scannable = files.filter((f) => !oversized.includes(f));
say(
  `  ${files.length} files, ${oversized.length} skipped as generated (over ${MAX_FILE_BYTES / 1000}KB, a line over ${MAX_LINE_CHARS} chars, or a generated header)\n`,
);
const mine = SHARD === null ? scannable : scannable.filter((_, i) => i % SHARD.of === SHARD.index);

if (SHARD === null) {
  const workers = Math.max(1, Math.min(12, os.availableParallelism() - 2));
  say(`  ${workers} workers\n`);
  const merged = new Map<string, { count: number; repos: Set<string>; samples: string[] }>();
  let linted = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: workers }, (_, index) => {
      return new Promise<void>((resolve, reject) => {
        const child = fork(new URL(import.meta.url).pathname, ['--no-clone', `--shard=${index}/${workers}`], {
          execPath: process.execPath,
          execArgv: process.execArgv,
          stdio: ['ignore', 'pipe', 'inherit', 'ipc'],
        });
        let out = '';
        child.stdout?.on('data', (chunk: Buffer) => {
          out += chunk.toString();
        });
        /**
         * `close`, not `exit`. `exit` fires when the process ends, which can be
         * before its stdout has drained — and these payloads are megabytes, so
         * the parse got a truncated object and threw. `close` fires once every
         * stdio stream has ended.
         */
        child.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`shard ${index} exited ${code}`));
            return;
          }
          let payload: {
            linted: number;
            failed: number;
            rules: Record<string, { count: number; repos: string[]; samples: string[] }>;
          };
          try {
            payload = JSON.parse(out) as typeof payload;
          } catch (error) {
            // Say WHICH shard and what it actually sent. The first version let
            // the raw payload land in the stack trace, which is how a 60KB
            // JSON blob ended up being the error message.
            reject(
              new Error(
                `shard ${index} sent ${out.length} bytes that did not parse: ${String(error).slice(0, 120)}`,
              ),
            );
            return;
          }
          linted += payload.linted;
          failed += payload.failed;
          for (const [id, hit] of Object.entries(payload.rules)) {
            const existing = merged.get(id) ?? { count: 0, repos: new Set<string>(), samples: [] };
            existing.count += hit.count;
            for (const r of hit.repos) existing.repos.add(r);
            for (const sample of hit.samples) if (existing.samples.length < 4) existing.samples.push(sample);
            merged.set(id, existing);
          }
          console.log(`  shard ${index} done — ${payload.linted} files`);
          resolve();
        });
      });
    }),
  );
  writeInventory(merged, linted, failed, present.length);
  process.exit(0);
}

const eslint = new ESLint({
  // NOT the benchmark config: that one matches `**/*.js` with no TypeScript
  // parser, so a run over 345,841 files produced findings from `.js` only —
  // 214,855 TypeScript files were walked, handed to ESLint, and matched by no
  // config block. See the header of the file below.
  overrideConfigFile: path.join(ROOT, 'eslint.real-source.config.mjs'),
  errorOnUnmatchedPattern: false,
  // A stranger's `eslint-disable` comment must not silence our measurement:
  // the question is what OUR rules see, not what their authors chose to hide.
  allowInlineConfig: false,
});

type Hit = { count: number; repos: Set<string>; samples: string[] };
const hits = new Map<string, Hit>();
let linted = 0;
let failed = 0;

const BATCH = 200;
for (let i = 0; i < mine.length; i += BATCH) {
  const batch = mine.slice(i, i + BATCH);
  let results: Awaited<ReturnType<ESLint['lintFiles']>>;
  try {
    results = await eslint.lintFiles(batch);
  } catch {
    failed += batch.length;
    continue;
  }
  for (const result of results) {
    linted += 1;
    const rel = path.relative(CACHE, result.filePath);
    const repo = rel.split('/')[0] ?? '';
    for (const message of result.messages) {
      const ruleId = message.ruleId;
      if (ruleId === null || ruleId === undefined) continue;
      const hit = hits.get(ruleId) ?? { count: 0, repos: new Set<string>(), samples: [] };
      hit.count += 1;
      hit.repos.add(repo);
      /**
       * One sample per repository, not the first four findings.
       *
       * The walk is alphabetical, so "first four" meant all four came from
       * whichever repository sorts first — every sample for every rule was
       * `18F/uswds-jekyll`, and for several rules all four were the same
       * vendored bundle. Four rows that are really one file cannot show what a
       * rule does across a corpus, which is the only reason to keep samples.
       */
      if (!hit.samples.some((existing) => existing.startsWith(`${repo}/`)) && hit.samples.length < 8) {
        hit.samples.push(`${rel}:${message.line}`);
      }
      hits.set(ruleId, hit);
    }
  }
  if (i % 4000 === 0 && SHARD !== null && SHARD.index === 0) {
    console.error(`  shard 0: ${linted}/${mine.length} files, ${hits.size} rules firing`);
  }
}

if (SHARD !== null) {
  process.stdout.write(
    JSON.stringify({
      linted,
      failed,
      rules: Object.fromEntries(
        [...hits.entries()].map(([id, hit]) => [id, { count: hit.count, repos: [...hit.repos], samples: hit.samples }]),
      ),
    }),
  );
  process.exit(0);
}

/**
 * Merge every shard's counts into the committed inventory.
 *
 * Defined as a function rather than run at the tail, because the coordinator
 * never lints anything itself — it has only what the workers sent back.
 */
function writeInventory(
  hits: Map<string, { count: number; repos: Set<string>; samples: string[] }>,
  linted: number,
  failed: number,
  reposScanned: number,
): void {
  const suite = new Set(allRules());
  /** Rule ids seen that are NOT ours: references from the scanned repo's own config. */
  const ours = [...hits.entries()].filter(([id]) => suite.has(id));
  const fired = new Set(ours.map(([id]) => id));
  const silent = [...suite].filter((id) => !fired.has(id)).sort();

  const inventory = {
    filesLinted: linted,
    filesFailed: failed,
    reposScanned,
    suiteRules: suite.size,
    withMaterial: fired.size,
    withoutMaterial: silent,
    rules: Object.fromEntries(
      ours
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, hit]) => [id, { count: hit.count, repos: hit.repos.size, samples: hit.samples }]),
    ),
    note:
      'Which rules fire on real third-party code. Reproduce with `npx tsx scripts/real-source-scan.mts`; ' +
      'the repository list is `benchmarks/real-source-repos.json`. Firing is not catching — see the header ' +
      'of that script. Inline eslint-disable comments in the scanned source are ignored, and files over ' +
      '200KB are skipped as generated.',
    generated: STAMP,
  };

  fs.writeFileSync(OUT, `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`\n  ${linted} files · ${reposScanned} repositories`);
  console.log(`  rules firing   ${fired.size}/${suite.size}`);
  console.log(`  rules silent   ${silent.length}`);
  console.log(`  → ${path.relative(ROOT, OUT)}`);
}
