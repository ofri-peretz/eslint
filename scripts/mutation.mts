#!/usr/bin/env -S npx tsx
/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * mutation — run Stryker over a plugin's rule sources and grade each rule
 * against the banked baseline in .agent/mutation-baseline.json.
 *
 *   npm run mutation -- --plugin postgresql-security
 *   npm run mutation -- --plugin jwt-security --since origin/main
 *   npm run mutation -- --all                     # every opted-in plugin
 *   npm run mutation -- --all --since origin/main # what the PR job runs
 *   npm run mutation -- --plugin jwt-security --update-baseline
 *   npm run mutation -- --plugin jwt-security --grade-only   # re-grade last report
 *
 * Flags:
 *   --since <ref>        mutate only rule files changed since merge-base(ref, HEAD)
 *   --concurrency <n>    Stryker workers (default 2 — see stryker.config.mjs)
 *   --update-baseline    bank this run's per-rule scores (never lowers one)
 *   --allow-regression   with --update-baseline: lower a banked score anyway
 *   --grade-only         skip Stryker; grade benchmark-results/stryker/<plugin>/mutation.json
 *   --force              ignore the incremental cache and re-test every mutant
 *
 * `--update-baseline` always implies `--force`. Incremental mode reuses a
 * mutant's last result when its code and covering tests look unchanged, and
 * for STATIC mutants (module-level code such as a pattern list) it does not
 * notice a newly added test that kills them: on the pilot, nine survivors in
 * jwt-security/no-weak-secret kept their stale "Survived" after the fixtures
 * that kill them landed. Fine for a quick local loop; never for a number
 * that gets banked. CI has no cache, so every CI run is a full one.
 *
 * A plugin is OPTED IN when it has an entry in the baseline. --all runs those
 * and only those. Exit codes: 0 pass, 1 a rule regressed or is unbaselined,
 * 2 usage / Stryker itself failed.
 *
 * How this differs from `npm run check:lock-proofs` (scripts/prove-locks.mts):
 * a lock proof is ONE hand-written mutation of the thing a lock test claims
 * to guard, run to show that lock is not vacuous. Stryker is the inverse
 * direction: it generates every mutation of the rule source it can, and asks
 * whether ANY test notices. The first proves a given test means something;
 * the second finds the code no test means anything about.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFlag } from './lib/prover-args.js';
import {
  bank,
  failing,
  grade,
  ruleOf,
  scoreReport,
  type Baseline,
  type MutationReport,
  type RuleScore,
  type Verdict,
} from './lib/mutation-score.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BASELINE = path.join(ROOT, '.agent', 'mutation-baseline.json');
const CONFIG = path.join(HERE, 'mutation', 'stryker.config.mjs');
const SUMMARY = path.join(ROOT, 'benchmark-results', 'stryker', 'summary.md');

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const since = readFlag(argv, '--since');
const concurrency = readFlag(argv, '--concurrency');
const UPDATE = has('--update-baseline');
const ALLOW_REGRESSION = has('--allow-regression');
const GRADE_ONLY = has('--grade-only');
const FORCE = has('--force') || UPDATE;

function usage(msg: string): never {
  console.error(
    `  ⛔ ${msg}\n     usage: npm run mutation -- --plugin <name> | --all [--since <ref>]`,
  );
  process.exit(2);
}

const baseline: Baseline = fs.existsSync(BASELINE)
  ? JSON.parse(fs.readFileSync(BASELINE, 'utf8'))
  : { plugins: {} };

const named = argv
  .flatMap((a, i) => (argv[i - 1] === '--plugin' ? a.split(',') : []))
  .concat(
    argv
      .filter((a) => a.startsWith('--plugin='))
      .flatMap((a) => a.slice(9).split(',')),
  )
  .map((p) => p.replace(/^eslint-plugin-/, ''));
const plugins = has('--all') ? Object.keys(baseline.plugins) : named;
if (plugins.length === 0) usage('name a plugin with --plugin, or pass --all');
if (ALLOW_REGRESSION && !UPDATE)
  usage('--allow-regression only means something with --update-baseline');

function changedRuleFiles(pluginDir: string, ref: string): string[] {
  const base = execFileSync('git', ['merge-base', ref, 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  const rel = path.relative(ROOT, pluginDir);
  const out = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      '--diff-filter=AMR',
      base,
      '--',
      `${rel}/src/rules`,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return out
    .split('\n')
    .filter((f) => f && ruleOf(f))
    .map((f) => path.relative(rel, f));
}

function runStryker(
  plugin: string,
  pluginDir: string,
  mutate: string[] | undefined,
): boolean {
  const args = ['stryker', 'run', CONFIG];
  if (mutate) args.push('--mutate', mutate.join(','));
  if (concurrency) args.push('--concurrency', concurrency);
  if (FORCE) args.push('--force');
  const r = spawnSync('npx', args, {
    cwd: pluginDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      MUTATION_PLUGIN: plugin,
      MUTATION_PLUGIN_DIR: pluginDir,
    },
  });
  return r.status === 0;
}

const ICON: Record<Verdict['kind'], string> = {
  ok: 'ok',
  improved: 'IMPROVED',
  regressed: 'REGRESSED',
  unbaselined: 'UNBASELINED',
};

const md: string[] = ['## Mutation testing (Stryker)', ''];
let failed = false;
let next = baseline;

for (const plugin of plugins) {
  const pluginDir = path.join(ROOT, 'packages', `eslint-plugin-${plugin}`);
  if (!fs.existsSync(path.join(pluginDir, 'src', 'rules')))
    usage(`no such plugin: ${plugin}`);
  const report = path.join(
    ROOT,
    'benchmark-results',
    'stryker',
    plugin,
    'mutation.json',
  );

  let mutate: string[] | undefined;
  if (since) {
    mutate = changedRuleFiles(pluginDir, since);
    if (mutate.length === 0) {
      console.log(
        `\n  ${plugin}: no rule source changed since ${since} — skipped`,
      );
      md.push(
        `**${plugin}** — no rule source changed since \`${since}\`, skipped.`,
        '',
      );
      continue;
    }
    console.log(
      `\n  ${plugin}: mutating ${mutate.length} changed file(s)\n    ${mutate.join('\n    ')}`,
    );
  }

  if (!GRADE_ONLY) {
    fs.rmSync(report, { force: true });
    if (!runStryker(plugin, pluginDir, mutate)) {
      console.error(`  ⛔ Stryker failed for ${plugin} (see output above)`);
      md.push(`**${plugin}** — Stryker itself failed; no score.`, '');
      failed = true;
      continue;
    }
  }
  if (!fs.existsSync(report))
    usage(
      `no report at ${path.relative(ROOT, report)} — run without --grade-only first`,
    );

  const scores: Record<string, RuleScore> = scoreReport(
    JSON.parse(fs.readFileSync(report, 'utf8')) as MutationReport,
  );
  const verdicts = grade(scores, baseline.plugins[plugin]?.rules);

  md.push(
    `### ${plugin}`,
    '',
    '| rule | score | baseline | killed | survived | no cov | verdict |',
    '| :-- | --: | --: | --: | --: | --: | :-- |',
  );
  console.log(`\n  ${plugin}`);
  for (const v of verdicts) {
    const s = scores[v.rule];
    const b = 'baseline' in v ? v.baseline.toFixed(1) : '—';
    md.push(
      `| \`${v.rule}\` | ${v.current.toFixed(1)} | ${b} | ${s.killed + s.timeout} | ${s.survived} | ${s.noCoverage} | ${ICON[v.kind]} |`,
    );
    console.log(
      `    ${ICON[v.kind].padEnd(11)} ${v.rule.padEnd(32)} ${v.current.toFixed(1).padStart(5)}  (baseline ${b})`,
    );
  }
  md.push('');

  if (UPDATE) {
    const r = bank(next, plugin, scores, ALLOW_REGRESSION);
    next = r.baseline;
    for (const rule of r.refused) {
      console.error(
        `  ⛔ refused to lower ${plugin}/${rule} — pass --allow-regression if that is the decision`,
      );
      failed = true;
    }
  } else {
    const bad = failing(verdicts);
    if (bad.length > 0) failed = true;
    for (const v of bad) {
      console.error(
        v.kind === 'unbaselined'
          ? `  ⛔ ${plugin}/${v.rule} has no banked score — bank it with --update-baseline`
          : `  ⛔ ${plugin}/${v.rule} dropped ${v.baseline} → ${v.current}: a mutant that used to die now survives. Open the HTML report and add the fixture it points at.`,
      );
    }
    for (const v of verdicts.filter((x) => x.kind === 'improved')) {
      console.log(
        `  ↑ ${plugin}/${v.rule} improved — bank it with --update-baseline so it cannot slide back`,
      );
    }
  }
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`\n  banked → ${path.relative(ROOT, BASELINE)}`);
}
fs.mkdirSync(path.dirname(SUMMARY), { recursive: true });
fs.writeFileSync(SUMMARY, `${md.join('\n')}\n`);
process.exit(failed ? 1 : 0);
