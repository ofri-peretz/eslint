/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ILB-Corpus-Truth — how every SDK rule behaves on code we did not write.
 *
 * Every other bench in this repo measures accuracy on fixtures we authored or
 * curated. That is necessary and it is structurally blind to one failure mode:
 * a rule that fires on files having nothing to do with its SDK. Measured once
 * by hand on 2026-08-10, **one finding in three across the SDK plugins was
 * about an SDK the file never imports** (158,711 of 465,216 over 107,382
 * files), and 82 of 310 rules never fired at all. Four plugins were fixed on
 * the strength of that number; this suite is what stops the fifth.
 *
 * Per rule it reports:
 *
 *   findings    total reports across the corpus
 *   offSdk      reports in files with no local evidence of the rule's SDK
 *   sdkFiles    files that DO carry that SDK
 *   hitFiles    files where the rule reported, anywhere
 *   sdkHitFiles files where it reported AND the SDK is present
 *   yield       sdkHitFiles / sdkFiles — how often the rule has something to
 *               say about a file it is actually responsible for. Both sides are
 *               the same population, so it cannot exceed 100%; an earlier
 *               version divided hitFiles by sdkFiles and recorded 198%.
 *   collisions  lines where another plugin reported the same CWE
 *
 * `offSdk` is an upper bound by construction — see the note in `sdk-map.ts` on
 * why the probe is deliberately independent of the gates it measures.
 *
 * Usage:
 *   npm run ilb:corpus-truth                  # measure, write result + history
 *   npm run ilb:corpus-truth -- --json        # machine output only
 *   npm run ilb:corpus-truth -- --update-baseline
 *   ILB_CORPUS_TRUTH_DIR=/path npm run ilb:corpus-truth   # skip cloning
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
import { SDK_PACKAGES, specifiersIn, fileHasSdk } from './sdk-map.ts';
import {
  corpusHash,
  driftedRoots,
  headOf,
  manifestDelta,
  type CorpusRoot,
} from './corpus-identity.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.resolve(HERE, '../..');
const REPO_ROOT = path.resolve(BENCH_ROOT, '..');
const RESULTS_DIR = path.join(BENCH_ROOT, 'results', 'ilb-corpus-truth');
const BASELINE_PATH = path.join(HERE, 'baseline.json');
const REPOS_PATH = path.join(HERE, 'repos.json');

const ARGS = process.argv.slice(2);
const EMIT_JSON = ARGS.includes('--json');
const UPDATE_BASELINE = ARGS.includes('--update-baseline');
const BATCH = 300;

const log = (msg: string): void => {
  if (!EMIT_JSON) console.log(msg);
};

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
    // Symlinks are followed (a staged corpus is made of them), so a
    // self-referential or mutually referential link inside any of the 107
    // third-party repos would recurse until the stack blows and take the whole
    // sweep with it. Real paths, not the link paths, are what identify a cycle.
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
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && statIsDir(full));
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


type RuleStat = {
  plugin: string;
  cwe: string | null;
  findings: number;
  offSdk: number;
  hitFiles: number;
  sdkHitFiles: number;
  sdkFiles: number;
  collisions: number;
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
  log(`\n📚 ILB-Corpus-Truth — ${repos.length} pinned repositories\n`);

  // A local corpus that is already on disk is used as-is. Cloning 107 repos is
  // minutes of network time and the pinned commits make the two paths
  // equivalent, so the override exists to keep iteration cheap.
  const override = process.env.ILB_CORPUS_TRUTH_DIR;
  const corpusRoots: CorpusRoot[] = [];
  if (override) {
    log(`   Using ILB_CORPUS_TRUTH_DIR=${override}`);
    for (const entry of fs.readdirSync(override)) {
      const full = path.join(override, entry);
      // statSync, not withFileTypes: a corpus staged as symlinks reports
      // isDirectory() === false on the link itself, which silently yields an
      // empty corpus.
      try {
        if (!fs.statSync(full).isDirectory()) continue;
      } catch {
        continue; // dangling link
      }
      corpusRoots.push({ name: entry, dir: full, head: headOf(full) });
    }
  } else {
    const benchDir = resolveBenchDir(REPO_ROOT);
    for (const repo of repos) {
      log(`   ${repo.name}`);
      const dir = cloneRepo(repo, benchDir);
      corpusRoots.push({ name: repo.name, dir, head: headOf(dir) });
    }
  }

  // Roots not at the commit `repos.json` pins — counted and carried into the
  // result rather than left as a stdout warning nobody reads.
  const pinned = new Map(repos.map((r) => [r.name, r.commit]));
  const drifted = driftedRoots(corpusRoots, pinned);
  const delta = manifestDelta(corpusRoots, repos.map((r) => r.name));
  if (delta.missing.length > 0 || delta.extra.length > 0) {
    log(
      `\n⚠️  Corpus does not match the manifest: ${delta.missing.length} missing, ` +
        `${delta.extra.length} unexpected.`,
    );
    if (delta.missing.length > 0) log(`     missing: ${delta.missing.slice(0, 5).join(', ')}`);
    if (delta.extra.length > 0) log(`     extra:   ${delta.extra.slice(0, 5).join(', ')}`);
  }
  if (drifted.length > 0) {
    log(
      `\n⚠️  ${drifted.length}/${corpusRoots.length} roots are not at their pinned commit:`,
    );
    for (const r of drifted.slice(0, 5)) {
      log(`     ${r.name}: ${r.head?.slice(0, 8) ?? 'no git'} ≠ ${pinned.get(r.name)?.slice(0, 8)}`);
    }
    if (drifted.length > 5) log(`     …and ${drifted.length - 5} more`);
  }

  const hash = corpusHash(corpusRoots);
  const roots = corpusRoots.map((r) => r.dir);

  const visited = new Set<string>();
  const files = roots.flatMap((r) => sourceFilesIn(r, visited));
  log(`\n🔍 ${files.length} source files\n`);

  // A sweep that scanned nothing reports zero findings and reads exactly like a
  // clean sweep. Both of the first two hand-runs of this measurement did that —
  // once because every file was outside ESLint's base path, once because the
  // corpus was staged as symlinks — so it is a hard failure, not a warning.
  if (files.length === 0) {
    console.error(
      `\n❌ No source files found under ${roots.length} root(s). ` +
        'Nothing was measured; refusing to report a result.',
    );
    process.exitCode = 1;
    return;
  }

  // Load every SDK plugin from source. Rules are keyed `<plugin>/<rule>` so a
  // finding always says which plugin owns it.
  const plugins: Record<string, unknown> = {};
  const rules: Record<string, 'error'> = {};
  const stats = new Map<string, RuleStat>();

  for (const suffix of Object.keys(SDK_PACKAGES)) {
    const mod = await import(
      `${REPO_ROOT}/packages/eslint-plugin-${suffix}/src/index.ts`
    );
    const plugin = (mod.default ?? mod) as {
      rules: Record<string, { meta?: { docs?: { cwe?: string } } }>;
    };
    plugins[suffix] = plugin;
    for (const [name, rule] of Object.entries(plugin.rules)) {
      const id = `${suffix}/${name}`;
      rules[id] = 'error';
      stats.set(id, {
        plugin: suffix,
        cwe: rule.meta?.docs?.cwe ?? null,
        findings: 0,
        offSdk: 0,
        hitFiles: 0,
        sdkHitFiles: 0,
        sdkFiles: 0,
        collisions: 0,
      });
    }
  }
  log(`⚙️  ${stats.size} rules across ${Object.keys(SDK_PACKAGES).length} plugins\n`);

  const eslint = new ESLint({
    // The corpus lives outside the repo and is gitignored, so both the base-path
    // check and the ignore rules have to be disabled or every file comes back as
    // "ignored" — a ruleId-less warning that reads exactly like a parse error.
    cwd: override ? path.resolve(override) : resolveBenchDir(REPO_ROOT),
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: {
      // A config whose only `files` entry is `**/*` is universal: it applies to
      // files but never causes one to be linted. Extensions must be explicit.
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
      rules,
    },
  });

  let scanned = 0;
  let errors = 0;
  let batchFailures = 0;
  let filesLostToBatchFailures = 0;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    let results;
    try {
      results = await eslint.lintFiles(batch);
    } catch (e) {
      // A thrown batch used to be skipped silently: up to 300 files that never
      // incremented `scanned` and never incremented `errors`, so the
      // harness-health guard below could not see the loss — the exact failure
      // mode that guard exists to catch.
      batchFailures++;
      filesLostToBatchFailures += batch.length;
      console.error(
        `   ⚠️  batch ${i}-${i + batch.length} threw: ${(e as Error).message.slice(0, 120)}`,
      );
      continue;
    }
    for (const res of results) {
      scanned++;
      let source = '';
      try {
        source = fs.readFileSync(res.filePath, 'utf8');
      } catch {
        /* unreadable — counted as scanned with no evidence */
      }
      const specifiers = specifiersIn(source);
      const hasSdk = (plugin: string): boolean =>
        fileHasSdk(specifiers, plugin);

      for (const plugin of Object.keys(SDK_PACKAGES)) {
        if (!hasSdk(plugin)) continue;
        for (const [, stat] of stats) {
          if (stat.plugin === plugin) stat.sdkFiles++;
        }
      }

      const hitRules = new Set<string>();
      // (line → cwe → plugins) so a CWE reported on one line by two plugins is
      // countable. Collision is the shape that made one defect look like three.
      const byLine = new Map<number, Map<string, Set<string>>>();

      for (const msg of res.messages) {
        if (!msg.ruleId) {
          errors++;
          continue;
        }
        const stat = stats.get(msg.ruleId);
        if (!stat) continue;
        stat.findings++;
        if (!hasSdk(stat.plugin)) stat.offSdk++;
        hitRules.add(msg.ruleId);
        if (stat.cwe) {
          const cwes = byLine.get(msg.line) ?? new Map<string, Set<string>>();
          const owners = cwes.get(stat.cwe) ?? new Set<string>();
          owners.add(stat.plugin);
          cwes.set(stat.cwe, owners);
          byLine.set(msg.line, cwes);
        }
      }

      for (const id of hitRules) {
        const stat = stats.get(id)!;
        stat.hitFiles++;
        // `yield` divides by sdkFiles, so its numerator has to come from the
        // same population. Counting every hit file against an SDK-only
        // denominator produced a yield of 198% for
        // vercel-ai-security/no-training-data-exposure in the first committed
        // result — a ratio above 100% is the tell that two populations were
        // mixed.
        if (hasSdk(stat.plugin)) stat.sdkHitFiles++;
      }

      for (const [, cwes] of byLine) {
        for (const [cwe, owners] of cwes) {
          if (owners.size < 2) continue;
          for (const [id, stat] of stats) {
            if (stat.cwe === cwe && owners.has(stat.plugin) && hitRules.has(id)) {
              stat.collisions++;
            }
          }
        }
      }
    }
    if (i % 15_000 === 0 && i > 0) log(`   ${i}/${files.length}`);
  }

  // Same reasoning as the empty-corpus guard: if essentially every file errored,
  // the zeroes below describe the harness, not the rules.
  if (scanned === 0 || errors > scanned || filesLostToBatchFailures > files.length / 10) {
    console.error(
      `\n❌ ${scanned}/${files.length} files scanned, ${errors} parse/config errors, ` +
        `${filesLostToBatchFailures} files lost to ${batchFailures} failed batches — ` +
        'the run describes the harness, not the rules. Refusing to report.',
    );
    process.exitCode = 1;
    return;
  }

  const perRule = Object.fromEntries(
    [...stats].map(([id, s]) => [
      id,
      {
        plugin: s.plugin,
        cwe: s.cwe,
        findings: s.findings,
        offSdk: s.offSdk,
        offSdkPct: s.findings ? +((s.offSdk / s.findings) * 100).toFixed(1) : 0,
        hitFiles: s.hitFiles,
        sdkHitFiles: s.sdkHitFiles,
        sdkFiles: s.sdkFiles,
        // Of the files that carry this SDK, the share this rule reported on.
        // Both sides are the SDK population, so it cannot exceed 100%.
        yield: s.sdkFiles ? +((s.sdkHitFiles / s.sdkFiles) * 100).toFixed(2) : 0,
        collisions: s.collisions,
        dead: s.findings === 0,
      },
    ]),
  );

  const totals = [...stats].reduce(
    (acc, [, s]) => ({
      findings: acc.findings + s.findings,
      offSdk: acc.offSdk + s.offSdk,
      collisions: acc.collisions + s.collisions,
      dead: acc.dead + (s.findings === 0 ? 1 : 0),
    }),
    { findings: 0, offSdk: 0, collisions: 0, dead: 0 },
  );

  const date = new Date().toISOString().slice(0, 10);
  const result = {
    bench: 'ILB-Corpus-Truth',
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
      // Single-dimension F1 is deliberately absent: this bench measures scope,
      // not accuracy. A rule can be perfectly precise inside its SDK and still
      // be 98% off-SDK.
      offSdkRate: totals.findings
        ? +((totals.offSdk / totals.findings) * 100).toFixed(1)
        : 0,
      deadRules: totals.dead,
      ruleCount: stats.size,
    },
    corpus: {
      repos: repos.length,
      // The identity of what was measured. Two results are only comparable when
      // these match; see `corpusHash`.
      hash,
      rootsAtPinnedCommit: corpusRoots.length - drifted.length,
      rootsDrifted: drifted.length,
      rootsMissing: delta.missing.length,
      rootsUnexpected: delta.extra.length,
      driftedRoots: drifted.map((r) => r.name),
      filesScanned: scanned,
      // Printed beside the findings on purpose. A sweep where every file errored
      // reports zero findings and looks exactly like a clean sweep; this number
      // is the only thing that distinguishes them.
      parseOrConfigErrors: errors,
      // Reported even at zero: a silent batch failure is indistinguishable from
      // a smaller corpus unless the number is always present.
      batchFailures,
      filesLostToBatchFailures,
    },
    totals,
    rules: perRule,
  };

  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const outPath = path.join(RESULTS_DIR, `${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  appendHistory(result, outPath);

  if (EMIT_JSON) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } else {
    report(perRule, totals, scanned, errors);
    console.log(`\n✅ Results: ${path.relative(REPO_ROOT, outPath)}`);
  }

  if (UPDATE_BASELINE && delta.missing.length > 0) {
    console.error(
      `\n❌ ${delta.missing.length} of ${repos.length} pinned repositories are not in the ` +
        'corpus. A baseline recorded from an incomplete corpus is a set of ' +
        'ceilings for code that was never measured — and it hashes cleanly, so ' +
        'nothing downstream would notice.\n' +
        `   missing: ${delta.missing.slice(0, 10).join(', ')}` +
        (delta.missing.length > 10 ? `, …and ${delta.missing.length - 10} more` : ''),
    );
    process.exitCode = 1;
    return;
  }

  if (UPDATE_BASELINE && drifted.length > 0) {
    console.error(
      `\n❌ ${drifted.length} corpus roots are not at their pinned commit. ` +
        'A baseline recorded from a drifted corpus is a ceiling for code nobody ' +
        'else will measure. Re-clone (unset ILB_CORPUS_TRUTH_DIR) and retry.',
    );
    process.exitCode = 1;
    return;
  }

  if (UPDATE_BASELINE) {
    const baseline = {
      generatedAt: result.timestamp,
      // Deliberately no `methodologyHash`. A receipt is only worth recording if
      // it can be reproduced, and a baseline is usually written from a working
      // tree mid-change — the hash would cover content that exists at no
      // commit. Pre-registration belongs on the per-run *result*, which records
      // its own dirty paths. What the gate actually reads is below.
      //
      // The per-rule ceilings are only meaningful against this exact corpus, so
      // its identity is recorded with them and checked before any comparison.
      corpusHash: hash,
      filesScanned: scanned,
      note: 'Per-rule off-SDK ceiling. Regenerate with --update-baseline only when the increase is understood and explained in the PR body.',
      rules: Object.fromEntries(
        Object.entries(perRule).map(([id, r]) => [id, r.offSdk]),
      ),
    };
    fs.writeFileSync(
      BASELINE_PATH,
      JSON.stringify(baseline, null, 2) + '\n',
      'utf8',
    );
    log(`\n📌 Baseline updated: ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    log('\n⚠️  No baseline — run with --update-baseline to record one.');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')) as {
    rules: Record<string, number>;
    corpusHash?: string;
    filesScanned?: number;
  };

  // Comparing across corpora is the failure this check exists to prevent: the
  // two runs that motivated it saw 107,384 and 119,415 files of the "same" 107
  // repositories, and every per-rule delta between them was corpus drift
  // wearing a regression's clothes.
  if (baseline.corpusHash !== undefined && baseline.corpusHash !== hash) {
    console.error(
      `\n❌ Corpus mismatch — refusing to compare.\n` +
        `   baseline: ${baseline.corpusHash} (${baseline.filesScanned ?? '?'} files)\n` +
        `   this run: ${hash} (${scanned} files)\n` +
        '   Every per-rule delta would be drift, not signal. Re-clone the pinned ' +
        'corpus, or re-record the baseline deliberately with --update-baseline.',
    );
    process.exitCode = 1;
    return;
  }
  // The hash covers name@commit, which is necessary and NOT sufficient. The two
  // runs that motivated all of this reported 107,384 and 119,415 files with no
  // commit drift between them, so a commit-only identity would have called them
  // the same corpus and compared them anyway. Whatever differed — clone depth, a
  // dirty working tree, untracked files — changed how much code was measured,
  // and a per-rule count is meaningless across that.
  //
  // 0.5% is wide enough for incidental noise and far tighter than the 11% that
  // went unnoticed.
  const FILE_COUNT_TOLERANCE = 0.005;
  if (baseline.filesScanned !== undefined && baseline.filesScanned > 0) {
    const delta = Math.abs(scanned - baseline.filesScanned) / baseline.filesScanned;
    if (delta > FILE_COUNT_TOLERANCE) {
      console.error(
        `\n❌ Corpus size mismatch — refusing to compare.\n` +
          `   baseline: ${baseline.filesScanned} files\n` +
          `   this run: ${scanned} files (${(delta * 100).toFixed(1)}% difference)\n` +
          '   The commits match, so something outside them changed what was measured ' +
          '— clone depth, a dirty tree, untracked files. Per-rule counts do not ' +
          'survive that.',
      );
      process.exitCode = 1;
      return;
    }
  }

  if (baseline.corpusHash === undefined) {
    log(
      '\n⚠️  Baseline predates corpus pinning and carries no hash, so this ' +
        'comparison cannot be trusted. Re-record it with --update-baseline.',
    );
  }
  const regressions = Object.entries(perRule)
    .map(([id, r]) => ({ id, now: r.offSdk, was: baseline.rules[id] }))
    .filter((r) => r.was !== undefined && r.now > r.was);
  // A rule absent from the baseline is new. It gets no free pass: an ungated
  // new rule is exactly the case this bench exists to catch.
  const unbaselined = Object.entries(perRule).filter(
    ([id, r]) => baseline.rules[id] === undefined && r.offSdk > 0,
  );

  if (regressions.length === 0 && unbaselined.length === 0) {
    log('\n✅ No rule reports more off-SDK findings than its baseline.');
    return;
  }
  console.error('\n❌ Off-SDK regressions:');
  for (const r of regressions) {
    console.error(`   ${r.id.padEnd(52)} ${r.was} → ${r.now}`);
  }
  for (const [id, r] of unbaselined) {
    console.error(`   ${id.padEnd(52)} new rule, ${r.offSdk} off-SDK findings`);
  }
  process.exitCode = 1;
}

function report(
  perRule: Record<string, { plugin: string; findings: number; offSdk: number; dead: boolean; collisions: number }>,
  totals: { findings: number; offSdk: number; collisions: number; dead: number },
  scanned: number,
  errors: number,
): void {
  const byPlugin = new Map<
    string,
    { findings: number; offSdk: number; collisions: number; rules: number; dead: number }
  >();
  for (const r of Object.values(perRule)) {
    const agg = byPlugin.get(r.plugin) ?? {
      findings: 0,
      offSdk: 0,
      collisions: 0,
      rules: 0,
      dead: 0,
    };
    agg.findings += r.findings;
    agg.offSdk += r.offSdk;
    agg.collisions += r.collisions;
    agg.rules += 1;
    agg.dead += r.dead ? 1 : 0;
    byPlugin.set(r.plugin, agg);
  }

  console.log(`\nscanned ${scanned} files, ${errors} parse/config errors\n`);
  console.log(
    'plugin'.padEnd(24) +
      'rules'.padStart(6) +
      'dead'.padStart(6) +
      'findings'.padStart(10) +
      'off-SDK'.padStart(9) +
      '  %',
  );
  for (const [plugin, a] of [...byPlugin].sort((x, y) => y[1].offSdk - x[1].offSdk)) {
    const pct = a.findings ? `${((a.offSdk / a.findings) * 100).toFixed(0)}%` : '—';
    console.log(
      plugin.padEnd(24) +
        String(a.rules).padStart(6) +
        String(a.dead).padStart(6) +
        String(a.findings).padStart(10) +
        String(a.offSdk).padStart(9) +
        `  ${pct}`,
    );
  }
  const pct = totals.findings
    ? `${((totals.offSdk / totals.findings) * 100).toFixed(0)}%`
    : '—';
  console.log(
    'TOTAL'.padEnd(24) +
      String(Object.keys(perRule).length).padStart(6) +
      String(totals.dead).padStart(6) +
      String(totals.findings).padStart(10) +
      String(totals.offSdk).padStart(9) +
      `  ${pct}`,
  );
  if (totals.collisions > 0) {
    console.log(
      `\n⚠️  ${totals.collisions} findings sit on a line where another plugin reported the same CWE.`,
    );
  }
}

await main();
