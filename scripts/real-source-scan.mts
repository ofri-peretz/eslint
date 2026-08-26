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

import { execFileSync } from 'node:child_process';
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
      if (onDisk.has(id)) out.push(id);
    }
  }
  return [...new Set(out)].sort();
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
      console.log(`  unreachable: ${repo}`);
    }
  }
}

const present = repos.filter((r) => fs.existsSync(path.join(CACHE, r.replace('/', '__'))));
console.log(`  ${present.length} repositories cached (${cloned} newly cloned, ${missing} unreachable)\n`);
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
console.log(`  ${files.length} files\n`);

const eslint = new ESLint({
  overrideConfigFile: path.join(ROOT, 'eslint.benchmark.config.mjs'),
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
for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
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
      if (hit.samples.length < 4) hit.samples.push(`${rel}:${message.line}`);
      hits.set(ruleId, hit);
    }
  }
  if (i % 2000 === 0) console.log(`  ${linted}/${files.length} files, ${hits.size} rules firing`);
}

const suite = new Set(allRules());
/** Rule ids seen that are NOT ours: references from the scanned repo's own config. */
const ours = [...hits.entries()].filter(([id]) => suite.has(id));
const fired = new Set(ours.map(([id]) => id));
const silent = [...suite].filter((id) => !fired.has(id)).sort();

const inventory = {
  filesLinted: linted,
  filesFailed: failed,
  reposScanned: present.length,
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
    'of that script. Inline eslint-disable comments in the scanned source are ignored.',
  generated: new Date().toISOString().slice(0, 10),
};

fs.writeFileSync(OUT, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`\n  ${linted} files · ${present.length} repositories`);
console.log(`  rules firing   ${fired.size}/${suite.size}`);
console.log(`  rules silent   ${silent.length}`);
console.log(`  → ${path.relative(ROOT, OUT)}`);
