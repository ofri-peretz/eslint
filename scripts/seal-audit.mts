/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * seal-audit.mts — fill in a rule's SEAL.json from what can be MEASURED, and
 * leave the rest visibly unanswered.
 *
 * A seal record hand-typed from a session's notes is a transcription exercise,
 * and transcription is where numbers quietly stop matching the thing they
 * describe — `BENCHMARK-RESULTS.md` sat for a day reporting "173 findings" for a
 * rule that produced 3. So the mechanical axes are re-derived on every run:
 *
 *   behaviour    scripts/rule-seal-probe.mts        11 checks
 *   duel         benchmarks/suites/ilb-rule-duel    F1 on the rule's corpus
 *   coverage     vitest --coverage, istanbul JSON   per rule, not the summary
 *   throughput   timed here, 500 / 2000 / 8000 LOC  linear is fine, quadratic is a defect
 *   realSource   the rule's CASES.json              findings, cases, unreviewed
 *   recorded     grep of the two results documents  §D5
 *
 * The judgement axes — `corpus` (were the fixtures written from the
 * vulnerability or from the rule's own tests?) and `adversarial` (did a wave
 * written to BREAK the tuned rule find nothing?) — cannot be derived and are
 * PRESERVED from the existing file, defaulting to `unmet`. `knownGaps` and every
 * `why` are preserved for the same reason: a machine cannot argue that a gap is
 * acceptable to ship with.
 *
 *   npx tsx scripts/seal-audit.mts                     # every rule with a corpus
 *   npx tsx scripts/seal-audit.mts <plugin>/<rule> …   # just these
 *   npx tsx scripts/seal-audit.mts --skip-coverage     # the slow axis
 */
import { Session } from 'node:inspector/promises';
import { Linter } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = path.join(ROOT, 'benchmarks/rule-corpus');
const skipCoverage = process.argv.includes('--skip-coverage');
const requested = process.argv.slice(2).filter((a) => a.includes('/'));

type Axis = { state: 'met' | 'unmet' | 'n/a'; evidence: string; command: string };
type Seal = {
  rule: string;
  status: 'sealed' | 'open';
  sealedOn: string | null;
  sealedTo: Record<string, string | number>;
  axes: Record<string, Axis>;
  knownGaps: unknown[];
};

const version = (pkg: string): string => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8'))
      .version as string;
  } catch {
    return 'unknown';
  }
};

const run = (file: string, args: string[]): string => {
  try {
    return execFileSync('npx', ['tsx', file, ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

/**
 * Throughput, per rule, at three sizes — measured as MARGINAL cost.
 *
 * The first version of this axis timed `linter.verify` with the rule enabled
 * and called the result the rule's cost. It reported
 * `secure-coding/detect-object-injection` as superlinear: 2.6 ms at 500 lines,
 * 2.8 ms at 2000, 90 ms at 8000. The control it never ran says otherwise —
 * a rule whose `create()` returns `{}` shows the same curve:
 *
 *   no-op (parse + scope only)   500L 2.3ms · 2000L 8.7ms · 8000L 71.2ms
 *   visit every node             500L 0.8ms · 2000L 2.2ms · 8000L 68.3ms
 *   detect-object-injection      500L 0.7ms · 2000L 1.5ms · 8000L 70.8ms
 *
 * The superlinearity is in `@typescript-eslint/parser` and ESLint's scope
 * construction. Every rule in the ecosystem pays it and no rule can avoid it,
 * so attributing it to a rule is a measurement defect — the same class as
 * reading a stale sentence in a results document as current evidence.
 *
 * What is attributable is the DIFFERENCE: the same input, once with the rule
 * and once with a no-op, subtracted. That is the only figure a rule author can
 * act on. It is small and noisy by nature, so each size is measured over
 * several passes and the minimum is taken — the minimum is the least
 * contaminated by scheduling, GC and background load.
 */
/**
 * Every extension the fixtures use, named explicitly.
 *
 * A wholly universal `files` pattern — star-star-slash-star — looks like "all
 * files" and is not. ESLint treats it as applying to files it is ALREADY
 * linting rather than as a reason to lint one, so under that pattern a .ts,
 * .tsx or .jsx file is never linted at all: `linter.verify` returns a single
 * non-fatal "No matching configuration found" and no rule runs.
 *
 * That is worse than the VOID it replaced. An unparsed fixture at least
 * reported VOID; an unmatched one reports a clean, fast, empty run. The commit
 * that widened this glob for browser-security's .jsx fixtures named that exact
 * failure — "renaming the fixture to .jsx WITHOUT widening the glob would have
 * applied no rule at all, and an empty run times as fast" — and then shipped it,
 * because the widening it chose does not widen.
 */
const LINTABLE = '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}';

const throughputOf = async (ruleId: string, rule: unknown, dir: string): Promise<Axis> => {
  const [prefix, ruleName] = ruleId.split('/');
  // Kept as SEPARATE files, not concatenated.
  //
  // Joining them into one source was the fourth defect in this measurement.
  // Two fixture files that each declare `const handler` are both valid; their
  // concatenation is a redeclaration, which is a SyntaxError in a module — and
  // a source that does not parse is a source the rule never runs on. On the
  // first run of the repaired instrument, 29 of 94 rule corpora produced an
  // unparseable concatenation and reported VOID for every size.
  //
  // Files are also the unit ESLint actually works in, so nothing is lost by
  // dropping the join: a rule sees the same fixtures, each in its own scope,
  // which is the shape it will meet in a consumer's repository.
  // Each fixture keeps its own EXTENSION as well as its own file. A .jsx
  // fixture parsed under a .ts filename is a syntax error, which is how 29 of
  // 94 corpora first reported VOID at every size — browser-security's fixtures
  // are React components. Worse, the flat config matched `**/*.ts` only, so
  // simply renaming the file to .jsx would have applied NO rule and timed an
  // empty run as fast.
  const fixtureFiles = ['vulnerable', 'safe'].flatMap((sub) => {
    const full = path.join(dir, sub);
    return fs.existsSync(full)
      ? fs.readdirSync(full).map((f) => ({
          code: fs.readFileSync(path.join(full, f), 'utf8'),
          ext: path.extname(f) || '.ts',
        }))
      : [];
  });
  const fixtures = fixtureFiles.map((f) => f.code).join('\n');
  if (!fixtures.trim()) {
    return {
      state: 'unmet',
      evidence: 'no corpus fixtures to time against',
      command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
    };
  }
  const linter = new Linter({ configType: 'flat' });
  const configFor = (r: unknown) => [
    {
      files: [LINTABLE],
      languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022 as const,
        sourceType: 'module' as const,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { probe: { rules: { [ruleName]: r } } },
      rules: { [`probe/${ruleName}`]: 'error' as const },
    },
  ];
  const noop = { create: () => ({}) };

  // Multiples of the fixture set, not absolute line counts.
  //
  // Targeting 32000 lines meant repeating a 304-line fixture set 105 times, and
  // since fixtures are linted as separate files that is 3360 `verify` calls per
  // run — 282,000 for one size on one rule once trials and passes multiply out.
  // The audit went from ~20s a rule to minutes, and almost all of it was fixed
  // per-verify overhead on ten-line files, which is precisely what the no-op
  // subtraction exists to cancel. Paying it 282,000 times to cancel it is not a
  // measurement, it is a tax.
  //
  // Multiples give the same thing the sizes were for — a 4x-per-step growth
  // curve — at a cost that scales with the corpus instead of against it. Rules
  // whose own cost then falls under the instrument's error report NOT
  // ESTABLISHED, which is the honest answer and already the answer for most of
  // them.
  /**
   * MEASURED BY ATTRIBUTION, NOT BY SUBTRACTION.
   *
   * The previous engine timed the corpus with the rule and again with a no-op
   * and subtracted. That is sound in principle and unusable in practice here:
   * the rule's cost is a small difference between two large, noisy numbers
   * dominated by the parser. On the ledger it produced 64 rules reading
   * "marginal over a no-op control — NOT ESTABLISHED" and 22 reading "NOT
   * REPRODUCIBLE", so 86 of 95 throughput failures were the instrument's, not
   * the rule's.
   *
   * The comment it replaced named its own successor: "a CPU profile
   * attributing samples to the rule's own frames". That is this. V8's sampling
   * profiler records which frame was executing, so the rule's cost is read
   * DIRECTLY off the samples whose script URL is the rule's own bundle — a
   * positive quantity, never a difference.
   *
   * Measured on `detect-object-injection`, the rule the old engine could not
   * decide:
   *
   *   no-op control      0 samples   0.00ms   0.0%   ← attribution is clean
   *   run 1            108 samples  15.55ms   2.9%
   *   run 2            109 samples  15.68ms   3.0%
   *   run 3            102 samples  14.73ms   2.9%
   *
   * where the old engine gave "0.0x, linear, met" and "12.9x, SUPERLINEAR,
   * unmet" on consecutive runs of the same unchanged rule.
   *
   * THE NO-OP CONTROL IS KEPT, as an assertion rather than a subtrahend. A
   * no-op must attribute exactly zero samples; anything else means attribution
   * is leaking (a bundler inlining rule code into another URL would do it),
   * and a leaking instrument reports parser time as rule time. The axis fails
   * loudly in that case instead of publishing the number.
   */
  /** A source that does not parse is a source the rule never ran on. */
  const parses = (source: string, name: string): boolean =>
    !linter
      .verify(
        source,
        [
          {
            files: [LINTABLE],
            languageOptions: {
              parser: tsParser,
              ecmaVersion: 2022 as const,
              sourceType: 'module' as const,
              parserOptions: { ecmaFeatures: { jsx: true } },
            },
            rules: {},
          },
        ],
        name,
      )
      .some((m) => m.fatal);

  const WORK_MULTIPLES = [10, 20, 40, 80];
  /**
   * Microseconds. V8's default is 1000µs, which is far too coarse here — the
   * rule is a thin slice of a parser-dominated run, and at 100µs a cheap rule
   * still landed only 26-48 samples, where a ratio carries ±30% noise and the
   * verdict flapped between runs. Resolution is the cheap axis to buy: 20µs
   * multiplies the sample count fivefold at the same work, where forcing the
   * same counts through more work costs five times the wall clock.
   */
  const SAMPLING_INTERVAL_US = 20;
  /**
   * Below this the sample count is too small for a ratio to mean anything —
   * at 5 samples one scheduling hiccup moves the growth figure by 20%.
   */
  const MIN_SAMPLES = 60;
  /** Bounded so a rule that genuinely costs nothing terminates rather than looping. */
  const MAX_ESCALATIONS = 3;

  const runWork = (r: unknown, multiple: number): void => {
    const config = configFor(r);
    for (let rep = 0; rep < multiple; rep += 1) {
      fixtureFiles.forEach((f, i) => linter.verify(f.code, config, `perf${rep}-${i}${f.ext}`));
    }
  };

  /** Samples attributed to the rule's own bundle, and the wall time they cover. */
  const profile = async (r: unknown, multiple: number): Promise<{ samples: number; ms: number }> => {
    const session = new Session();
    session.connect();
    try {
      await session.post('Profiler.enable');
      await session.post('Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US });
      await session.post('Profiler.start');
      runWork(r, multiple);
      const { profile: prof } = (await session.post('Profiler.stop')) as {
        profile: {
          nodes: { id: number; callFrame: { url: string } }[];
          samples?: number[];
          startTime: number;
          endTime: number;
        };
      };
      const urlOf = new Map(prof.nodes.map((n) => [n.id, n.callFrame.url || '']));
      const taken = prof.samples ?? [];
      const usPerSample = (prof.endTime - prof.startTime) / Math.max(taken.length, 1);
      const ownBundle = `eslint-plugin-${prefix}${path.sep}dist`;
      let samples = 0;
      for (const id of taken) if ((urlOf.get(id) ?? '').includes(ownBundle)) samples += 1;
      return { samples, ms: (samples * usPerSample) / 1000 };
    } finally {
      session.disconnect();
    }
  };

  const measureOnce = async (): Promise<Axis> => {
    // A fixture that is never LINTED is worse than one that never parses: it
    // costs nothing, so it times as fast and the axis passes on an empty run.
    const unlinted = fixtureFiles.findIndex((f, i) => {
      const seen = linter.verify(f.code, configFor(rule), `lintcheck${i}${f.ext}`);
      return seen.some((m) => /No matching configuration/.test(m.message));
    });
    if (unlinted !== -1) {
      throw new Error(
        `fixture #${unlinted} (${fixtureFiles[unlinted].ext}) is not matched by the throughput config for ${ruleId} — ` +
          `it would be timed as a zero-cost run. Add its extension to LINTABLE.`,
      );
    }
    const broken = fixtureFiles.findIndex((f, i) => !parses(f.code, `probe${i}${f.ext}`));
    if (broken !== -1) {
      return {
        state: 'unmet',
        evidence: `fixture #${broken} (${fixtureFiles[broken].ext}) does not parse, so the rule never ran on it`,
        command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
      };
    }

    // Warm the parser and the rule so first-call compilation is not attributed.
    runWork(rule, 2);

    const control = await profile(noop, WORK_MULTIPLES[WORK_MULTIPLES.length - 1]);
    if (control.samples !== 0) {
      return {
        state: 'unmet',
        evidence:
          `INSTRUMENT LEAKING: a no-op rule attributed ${control.samples} sample(s) to the rule bundle, so ` +
          `attribution cannot separate rule frames from harness frames. No throughput figure from this run is usable`,
        command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
      };
    }

    // ESCALATE UNTIL THE RULE IS BIG ENOUGH TO SEE.
    //
    // A single fixed work size cannot serve both ends of the ecosystem. At
    // 10x-80x, `detect-object-injection` yields 132 samples at the top and
    // `no-eval` yields 9 — and a rule sitting near the threshold flips between
    // "linear" and "not established" on consecutive runs, which is the
    // non-reproducibility the old engine was retired for. Cheap rules are not
    // unmeasurable; they need more work to sample.
    //
    // So scale the whole ladder by 4 until the top point has comfortably
    // cleared MIN_SAMPLES, bounded so a genuinely free rule terminates.
    let scale = 1;
    let points: { multiple: number; samples: number; ms: number }[] = [];
    for (let attempt = 0; attempt < MAX_ESCALATIONS; attempt += 1) {
      points = [];
      for (const multiple of WORK_MULTIPLES)
        points.push({ multiple: multiple * scale, ...(await profile(rule, multiple * scale)) });
      if (points[points.length - 1].samples >= MIN_SAMPLES * 2) break;
      scale *= 4;
    }
    const readable = `attributed to the rule's own frames: ${points
      .map((p) => `${p.multiple}x ${p.ms.toFixed(2)}ms (${p.samples} samples)`)
      .join(' · ')}`;

    // Read the slope over the LARGEST adjacent pair that clears MIN_SAMPLES.
    // The small end carries fixed first-run costs the big end amortises, so a
    // ratio taken there flatters the rule.
    let i = points.length - 2;
    while (i >= 0 && (points[i].samples < MIN_SAMPLES || points[i + 1].samples < MIN_SAMPLES)) i -= 1;
    if (i < 0) {
      return {
        state: 'unmet',
        evidence:
          `${readable} — NOT ESTABLISHED: no adjacent pair reaches ${MIN_SAMPLES} samples after escalating work ` +
          `${scale}x, so this rule's own cost stays under the profiler's resolution`,
        command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
      };
    }

    const workRatio = points[i + 1].multiple / points[i].multiple;
    const growth = points[i + 1].samples / points[i].samples;
    const superlinear = growth > workRatio * 1.5;
    return {
      state: superlinear ? 'unmet' : 'met',
      evidence:
        `${readable} — ${growth.toFixed(2)}x cost for ${workRatio.toFixed(1)}x work ` +
        `(${points[i].multiple}x→${points[i + 1].multiple}x), ${superlinear ? 'SUPERLINEAR' : 'linear or better'}`,
      command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
    };
  };

  const first = await measureOnce();
  const second = await measureOnce();
  const classify = (axis: Axis): string =>
    /NOT ESTABLISHED/.test(axis.evidence) ? 'not-established' : /SUPERLINEAR/.test(axis.evidence) ? 'superlinear' : 'linear';

  if (classify(first) !== classify(second)) {
    return {
      state: 'unmet',
      evidence:
        `NOT REPRODUCIBLE: two consecutive measurements disagreed — ` +
        `${classify(first)} then ${classify(second)}. ` +
        `First: ${first.evidence.replace(/^attributed to the rule's own frames: /, '')}`,
      command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
    };
  }
  return first;
};

const dirs = fs
  .readdirSync(CORPUS)
  // MANIFEST.md or SPEC.md — the older corpora use the second name, and a
  // filename is not a reason to leave a rule unaudited. `detect-non-literal-fs-filename`
  // was silently skipped by the first run for exactly that.
  .filter(
    (d) =>
      d.includes('__') &&
      (fs.existsSync(path.join(CORPUS, d, 'MANIFEST.md')) || fs.existsSync(path.join(CORPUS, d, 'SPEC.md'))),
  )
  .filter((d) => requested.length === 0 || requested.includes(d.replace('__', '/')));

const scoreSheet = fs.readFileSync(path.join(ROOT, 'benchmarks/RULE-SCORES.md'), 'utf8');
const results = fs.readFileSync(path.join(ROOT, 'BENCHMARK-RESULTS.md'), 'utf8');

for (const dir of dirs) {
  const ruleId = dir.replace('__', '/');
  const [prefix, ruleName] = ruleId.split('/');
  const sealFile = path.join(CORPUS, dir, 'SEAL.json');
  const existing: Partial<Seal> = fs.existsSync(sealFile)
    ? (JSON.parse(fs.readFileSync(sealFile, 'utf8')) as Seal)
    : {};
  const keep = (axis: string): Axis | undefined => existing.axes?.[axis];

  process.stdout.write(`  ${ruleId} … `);

  // behaviour
  const probe = run('scripts/rule-seal-probe.mts', [ruleId]);
  const failing = /(\d+) failing probe/.exec(probe)?.[1] ?? '?';
  const behaviour: Axis = {
    state: failing === '0' ? 'met' : 'unmet',
    evidence: failing === '0' ? '11/11, including the positive control' : `${failing} probe(s) failing`,
    command: `npx tsx scripts/rule-seal-probe.mts ${ruleId}`,
  };

  // duel
  const duel = run('benchmarks/suites/ilb-rule-duel/run.mjs', [ruleId]);
  const ours = /\| Interlace [^|]+\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)%\s*\|\s*([\d.]+)%\s*\|\s*\*\*([\d.]+)%\*\*/.exec(duel);
  const duelAxis: Axis = ours
    ? {
        state: ours[6] === '100.0' ? 'met' : 'unmet',
        evidence: `${ours[1]} TP / ${ours[2]} FP / ${ours[3]} FN — ${ours[4]}% precision, ${ours[5]}% recall, ${ours[6]}% F1`,
        command: `npx tsx benchmarks/suites/ilb-rule-duel/run.mjs ${ruleId}`,
      }
    : { state: 'unmet', evidence: 'duel produced no scored row', command: `npx tsx benchmarks/suites/ilb-rule-duel/run.mjs ${ruleId}` };

  // throughput
  // The rule is loaded from dist, so a stale build measures yesterday's rule and
  // reports it as today's. That has already produced a fix "verified" against an
  // unchanged binary more than once, so it is a hard failure, not a warning.
  const pkg = path.join(ROOT, 'packages', `eslint-plugin-${prefix}`);
  const built = fs.statSync(path.join(pkg, 'dist/src/index.js')).mtimeMs;
  const newestSource = (dirPath: string): number =>
    fs
      .readdirSync(dirPath, { withFileTypes: true })
      .reduce(
        (newest, entry) =>
          Math.max(
            newest,
            entry.isDirectory()
              ? newestSource(path.join(dirPath, entry.name))
              : fs.statSync(path.join(dirPath, entry.name)).mtimeMs,
          ),
        0,
      );
  if (newestSource(path.join(pkg, 'src')) > built) {
    throw new Error(
      `dist is older than src for eslint-plugin-${prefix}, so ${ruleId} would be measured against a stale build.\n` +
        `  Either the build has not been run since src changed — build and retry —\n` +
        `  or src changed WHILE the audit was running, which a checkout, merge or reset\n` +
        `  in this worktree will do, including one made by another session sharing it.\n` +
        `  In the second case the run is void rather than fixable: rebuild, and audit from\n` +
        `  a worktree nothing else is writing to.`,
    );
  }
  const mod = await import(path.join(pkg, 'dist/src/index.js'));
  const plugin = mod.default ?? mod;
  const throughput = await throughputOf(ruleId, plugin.rules[ruleName], path.join(CORPUS, dir));

  // realSource, from the case ledger
  const casesFile = path.join(CORPUS, dir, 'CASES.json');
  let realSource: Axis = keep('realSource') ?? {
    state: 'unmet',
    evidence: 'no CASES.json — the rule has never been classified against real code',
    command: `npm run cases -- ${ruleId} --update`,
  };
  if (fs.existsSync(casesFile)) {
    const ledger = JSON.parse(fs.readFileSync(casesFile, 'utf8')) as { cases: { verdict: string }[] };
    const tally = (v: string) => ledger.cases.filter((c) => c.verdict === v).length;
    const unreviewed = tally('unreviewed');
    const undecided = tally('undecided');
    const enforce = tally('enforce');
    // Reviewing every case is necessary and not sufficient. A ledger that is
    // mostly `undecided` means the rule's output could not be judged, which is
    // not the same as judging it acceptable — so the axis requires a decided
    // MAJORITY as well. no-redos-vulnerable-regex sits at 28 decided against 82
    // undecided; calling that "measured on real code" would be the flattering
    // reading again.
    const decided = enforce + tally('exempt');
    realSource = {
      state: unreviewed === 0 && ledger.cases.length > 0 && decided > undecided ? 'met' : 'unmet',
      evidence:
        `${ledger.cases.length} case(s): ${enforce} enforce, ${tally('exempt')} exempt, ` +
        `${undecided} undecided, ${unreviewed} unreviewed`,
      command: `npm run cases -- ${ruleId}`,
    };
  }

  // recorded (§D5) — PRESENCE IS NOT CURRENCY.
  //
  // The first version of this check asked whether the two documents MENTION the
  // rule, and passed `no-unlimited-resource-allocation` on the strength of a
  // line in BENCHMARK-RESULTS.md that reads "0 TP / 5 FP, 173 findings" — the
  // number this rule was fixed away from a day earlier. A checker that reads a
  // superseded sentence as evidence is committing the exact fault it polices.
  //
  // So the documents must carry a dated stamp, and the date must not predate the
  // rule's last change. Git is the arbiter of both.
  const lastChanged = (() => {
    try {
      return execFileSync(
        'git',
        ['log', '-1', '--format=%cs', '--', `packages/eslint-plugin-${prefix}/src/rules/${ruleName}/index.ts`],
        { cwd: ROOT, encoding: 'utf8' },
      ).trim();
    } catch {
      return '';
    }
  })();
  const stamp = new RegExp(`<!--\\s*seal ${ruleId} (\\d{4}-\\d{2}-\\d{2})\\s*-->`);
  const scoresStamp = stamp.exec(scoreSheet)?.[1];
  const resultsStamp = stamp.exec(results)?.[1];
  const current = (at: string | undefined): boolean => at !== undefined && at >= lastChanged;
  const recorded: Axis = {
    state: current(scoresStamp) && current(resultsStamp) ? 'met' : 'unmet',
    evidence:
      `rule last changed ${lastChanged || 'unknown'} · ` +
      `RULE-SCORES.md stamp ${scoresStamp ?? 'MISSING'} · BENCHMARK-RESULTS.md stamp ${resultsStamp ?? 'MISSING'}`,
    command: `grep -n 'seal ${ruleId}' benchmarks/RULE-SCORES.md BENCHMARK-RESULTS.md`,
  };

  // coverage
  // Every axis carries the command that would settle it, INCLUDING the ones
  // that have not been run — "not measured" with no way to measure it is the
  // shape of a to-do nobody can action.
  let coverage: Axis = keep('coverage') ?? {
    state: 'unmet',
    evidence: 'not measured — run without --skip-coverage',
    command: `npx vitest run --coverage src/rules/${ruleName}`,
  };
  if (!skipCoverage) {
    const out = path.join(ROOT, '.tmp-seal-cov', dir);
    try {
      execFileSync(
        'npx',
        ['vitest', 'run', '--coverage', '--coverage.reporter=json', `--coverage.reportsDirectory=${out}`, `src/rules/${ruleName}`],
        { cwd: path.join(ROOT, 'packages', `eslint-plugin-${prefix}`), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
    } catch {
      /* the global 100% threshold fails the process; the JSON is still written */
    }
    const jsonFile = path.join(out, 'coverage-final.json');
    if (fs.existsSync(jsonFile)) {
      const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8')) as Record<string, { s: Record<string, number>; b: Record<string, number[]> }>;
      const entry = Object.entries(data).find(([f]) => f.includes(`/${ruleName}/index.ts`));
      if (entry) {
        const [, d] = entry;
        const statements = Object.values(d.s);
        const branches = Object.values(d.b).flat();
        const pct = (v: number[]) => (v.length ? (100 * v.filter((x) => x > 0).length) / v.length : 100);
        const full = pct(statements) === 100 && pct(branches) === 100;
        coverage = {
          state: full ? 'met' : 'unmet',
          evidence: `${pct(statements).toFixed(2)}% statements, ${pct(branches).toFixed(2)}% branches (istanbul JSON)`,
          command: `npx vitest run --coverage src/rules/${ruleName}`,
        };
      }
    }
  }

  const axes: Record<string, Axis> = {
    // ── The three axes added 2026-08-18, when the bar became "under 5%
    // effective false positives". They are judgement axes on purpose: each
    // asks a question a script cannot answer, and each exists because getting
    // it wrong is what produced our worst measurement to date.
    oracle: keep('oracle') ?? {
      state: 'unmet',
      evidence:
        'no independent decider named. Until one is, any precision figure for this rule is OUR opinion of our own output — ' +
        'a hand-rolled timing classifier scored no-redos at 28.6% where recheck scored the identical patterns at ~96%',
      command: 'see ANALYSIS-LIMITS.md and the oracle column in RULE-SCORES.md',
    },
    effectiveFp: keep('effectiveFp') ?? {
      state: 'unmet',
      evidence:
        'never measured. Technical FP is not effective FP: a finding counts against us when it is wrong, AND when it is ' +
        'right but nobody would act on it. Bar is 5% for anything a preset enables',
      command: `npm run cases -- ${ruleId}`,
    },
    reachability: keep('reachability') ?? {
      state: 'unmet',
      evidence:
        'the rule\'s default contract is not asserted. A rule enabled by default must report only when it can resolve a ' +
        'path from an untrusted source; "report unless proven safe" is a different product and belongs opt-in',
      command: `grep -n "return true" packages/eslint-plugin-${prefix}/src/rules/${ruleName}/index.ts`,
    },
    corpus: keep('corpus') ?? {
      state: 'unmet',
      evidence: 'not asserted — a human must confirm the fixtures came from the vulnerability, not from the rule',
      command: `cat benchmarks/rule-corpus/${dir}/MANIFEST.md`,
    },
    duel: duelAxis,
    adversarial: keep('adversarial') ?? {
      state: 'unmet',
      evidence: 'no adversarial wave recorded',
      command: 'see RULE-TO-BAR-PLAYBOOK.md, phase 4',
    },
    realSource,
    partition: keep('partition') ?? {
      state: 'unmet',
      evidence: 'sink shapes not probed with the CWE family enabled',
      command: `npx tsx scripts/probe-rule.mts ${ruleId} <siblings> -- '<snippet>'`,
    },
    behaviour,
    coverage,
    throughput,
    recorded,
  };

  const seal: Seal = {
    rule: ruleId,
    status: Object.values(axes).every((a) => a.state !== 'unmet') ? 'sealed' : 'open',
    sealedOn: existing.sealedOn ?? null,
    sealedTo: {
      ecmaVersion: 2022,
      typescript: version('typescript'),
      eslint: version('eslint'),
      plugin: `eslint-plugin-${prefix}@${JSON.parse(fs.readFileSync(path.join(ROOT, 'packages', `eslint-plugin-${prefix}`, 'package.json'), 'utf8')).version}`,
      node: '24',
    },
    axes,
    knownGaps: existing.knownGaps ?? [],
  };
  fs.writeFileSync(sealFile, `${JSON.stringify(seal, null, 2)}\n`);
  const unmet = Object.entries(axes).filter(([, a]) => a.state === 'unmet').map(([k]) => k);
  console.log(`${seal.status}${unmet.length ? ` — unmet: ${unmet.join(', ')}` : ''}`);
}

fs.rmSync(path.join(ROOT, '.tmp-seal-cov'), { recursive: true, force: true });
