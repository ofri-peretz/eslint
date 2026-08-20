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

const throughputOf = (ruleId: string, rule: unknown, dir: string): Axis => {
  const [, ruleName] = ruleId.split('/');
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
  const unit = fixtures.split('\n');
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
  const SIZE_MULTIPLES = [1, 4, 16];
  const NOISE_FLOOR_MS = 0.2;
  const PASSES = 3;
  const best = (r: unknown, files: number): number => {
    const config = configFor(r);
    const run = (): void => {
      for (let rep = 0; rep < files; rep += 1) {
        fixtureFiles.forEach((f, i) => linter.verify(f.code, config, `perf${rep}-${i}${f.ext}`));
      }
    };
    run();
    let min = Infinity;
    for (let pass = 0; pass < PASSES; pass += 1) {
      const started = process.hrtime.bigint();
      run();
      min = Math.min(min, Number(process.hrtime.bigint() - started) / 1e6);
    }
    return min;
  };

  // Per size, the rule's marginal cost is a small difference between two large
  // timings, so ONE difference is not a measurement — it is a sample of a noisy
  // quantity. Take K paired trials, alternating rule and no-op so both see the
  // same machine, and report the MEDIAN difference with the median absolute
  // deviation as its error.
  //
  // Two weaker versions of this shipped first, both wrong in the flattering
  // direction. A fixed 0.2ms floor let the SAME unchanged rule read
  // "0.0x, linear, met" and "12.9x, SUPERLINEAR, unmet" on consecutive runs —
  // the 2000-line point drifted across the constant, which moved the judged
  // pair, which flipped the published verdict. Replacing the constant with a
  // single no-op-vs-no-op control was no better: that control is itself one
  // sample, and it read 0.20 / 1.53 / 8.57 ms for one rule at one size on three
  // consecutive runs. An error bar estimated from one draw is not an error bar.
  const TRIALS = 5;
  const median = (xs: number[]): number => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  // Scale the workload by adding FILES, not by growing one file.
  //
  // Three earlier shapes of this measurement were wrong, each in the flattering
  // direction, and the third is the subtle one:
  //
  //  1. `lines.slice(0, target)` cut through the middle of a function or an
  //     unterminated comment. A source that does not parse is a source the rule
  //     never runs on, so it timed at ~0ms and PASSED. Of four sizes,
  //     `detect-object-injection` parsed at exactly one; its "linear, met" came
  //     from a pair whose larger half was "Parsing error: '*/' expected".
  //
  //  2. A fixed 0.2ms noise floor let the SAME unchanged rule read "linear, met"
  //     and "SUPERLINEAR, unmet" on consecutive runs, and a floor estimated from
  //     a single no-op-vs-no-op control was no better — that control itself read
  //     0.20 / 1.53 / 8.57 ms for one rule at one size on three runs.
  //
  //  3. Repeating one fixture N times into ONE file does not make a workload N
  //     times bigger for a scope-sensitive rule — it makes one module scope with
  //     N copies of every top-level name, so each variable's reference list
  //     grows with N and any per-variable scan turns quadratic. Real code never
  //     has that shape. Measured on `detect-object-injection`, same total lines:
  //
  //         2008L   one file  2.8ms    4 files   2.6ms
  //         8032L   one file  9.5ms   16 files   9.9ms
  //        32128L   one file 76.2ms   64 files  39.3ms
  //
  //     One file reads 8x for 4x lines — SUPERLINEAR, and it is an artifact of
  //     the harness. Across files the same rule is 4.0x for 4x lines: linear.
  //     A control rule that reports at the same rate but does no analysis holds
  //     flat at ~2-7µs per report either way, which is what proved the growth
  //     belonged to the workload shape rather than to ESLint.
  //
  // Files are also what ESLint actually does, so this is the shape the number is
  // meant to describe.
  const parses = (source: string, name: string): boolean =>
    !linter
      .verify(source, [{ files: [LINTABLE], languageOptions: { parser: tsParser, ecmaVersion: 2022 as const, sourceType: 'module' as const, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: {} }], name)
      .some((m) => m.fatal);

  // A verdict that does not reproduce is not a verdict.
  //
  // Three revisions of this axis were tuned by widening the noise floor — a
  // constant, then one MAD-derived estimate, then five MADs — and each time the
  // same unchanged rule still read `linear, met` on one run and
  // `NOT ESTABLISHED` on the next, because the estimate of the noise is itself
  // noisy. No multiplier fixes that; it is the wrong knob.
  //
  // So the property is tested directly: measure twice, and publish a verdict
  // only when both measurements agree on it. Disagreement is not a tie to be
  // broken, it is the finding — this harness cannot resolve that rule's cost
  // today, and NOT ESTABLISHED says so.
  const measureOnce = (): Axis => {
    const marginal: number[] = [];
    const floors: number[] = [];
    const timings: string[] = [];
    const usable: boolean[] = [];
    const actual: number[] = [];
    for (const multiple of SIZE_MULTIPLES) {
      const files = multiple;
      actual.push(files * unit.length);
      // A fixture that is never LINTED is worse than one that never parses: it
      // costs nothing, so it times as fast and the axis passes on an empty run.
      // Proven reachable — the previous revision's glob left every .jsx and .ts
      // fixture unmatched, and the numbers it published were measuring nothing.
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
        usable.push(false);
        marginal.push(0);
        floors.push(Infinity);
        timings.push(`${actual[actual.length - 1]}L VOID (fixture #${broken} does not parse)`);
        continue;
      }
      usable.push(true);

      // Per size the rule's marginal cost is a small difference between two large
      // timings, so ONE difference is not a measurement — it is a sample of a
      // noisy quantity. Take K paired trials, alternating rule and no-op so both
      // see the same machine, and report the MEDIAN with the median absolute
      // deviation as its error.
      const differences: number[] = [];
      for (let trial = 0; trial < TRIALS; trial += 1) {
        differences.push(best(rule, files) - best(noop, files));
      }
      const centre = median(differences);
      const cost = Math.max(0, centre);
      const mad = median(differences.map((d) => Math.abs(d - centre))) * 1.4826;
      // Five MADs, not three.
      //
      // At three, `detect-object-injection` read +8.10±2.39ms at one size on one
      // run and +0.30±3.72ms on the next, landing just above the floor once and
      // well below it the other time — so the axis said "linear, met" and then
      // "NOT ESTABLISHED" for unchanged code. That is the moving ruler this
      // instrument has already been fixed for twice.
      //
      // A wider floor costs some `met` verdicts on rules whose cost genuinely
      // sits in the borderline band, and buys a verdict that does not depend on
      // which run you looked at. NOT ESTABLISHED is the honest answer for a cost
      // this harness cannot separate from its own noise, and it is never the
      // flattering one.
      const floor = Math.max(mad * 5, NOISE_FLOOR_MS);
      marginal.push(cost);
      floors.push(floor);
      timings.push(`${actual[actual.length - 1]}L +${cost.toFixed(2)}±${mad.toFixed(2)}ms`);
    }

    // Judge the growth on the largest PAIR of sizes whose smaller member is above
    // the noise floor, and compare it against that pair's own line ratio.
    //
    // Dividing the 8000-line cost by the 500-line one looks obvious and is wrong
    // whenever the 500-line cost rounds to zero: the ratio is undefined, and the
    // first version of this check silently substituted 1 and called it linear.
    // `detect-object-injection` measures +0.00 / +0.30 / +18.41 ms — a 61x rise
    // across a 4x rise in lines, reported as "1.0x, linear". Three checks in this
    // session have now failed in the flattering direction; a comparison that
    // cannot be made must be reported as such, never resolved to a pass.
    let verdict: Axis;
    let index = SIZE_MULTIPLES.length - 2;
    while (index >= 0 && (!usable[index] || !usable[index + 1] || marginal[index] < floors[index])) index -= 1;

    if (index < 0) {
      // Fewer than two sizes are above the noise floor, so there is no curve to
      // read. That is NOT a pass — it is an unmeasurable, and the difference
      // matters: `detect-object-injection` measures +0.01 / +0.03 / +11.30 ms,
      // where the first two are noise and the third is real, and an earlier
      // version of this branch called that "below the noise floor at every size"
      // and marked it met.
      //
      // The subtraction itself is sound; the sizes are wrong. Harness cost at
      // 8000 lines is ~70 ms, so a sub-millisecond rule cost is below the
      // resolution of a difference between two ~70 ms measurements — the same
      // rule measured +1.50 ms and +0.00 ms at 500 lines on consecutive runs.
      // Measuring this properly needs either sizes large enough to lift the rule
      // cost above the floor at more than one point, or a CPU profile attributing
      // samples to the rule's own frames. Until one of those is built, the axis
      // reports what it is: not established.
      verdict = {
        state: 'unmet',
        evidence:
          `marginal over a no-op control: ${timings.join(' · ')} — NOT ESTABLISHED: ` +
          `fewer than two sizes clear the instrument's own measured error, so no growth curve can be read`,
        command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
      };
    } else {
      const lineRatio = actual[index + 1] / actual[index];
      const growth = marginal[index + 1] / marginal[index];
      // 1.6x headroom over the line ratio absorbs measurement noise without
      // absorbing an order of growth.
      const linear = growth <= lineRatio * 1.6;
      verdict = {
        state: linear ? 'met' : 'unmet',
        evidence:
          `marginal over a no-op control: ${timings.join(' · ')} — ` +
          `${growth.toFixed(1)}x time for ${lineRatio.toFixed(1)}x lines (${actual[index]}→${actual[index + 1]}), ` +
          `${linear ? 'linear' : 'SUPERLINEAR'}`,
        command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
      };
    }

    return verdict;
  };

  const first = measureOnce();
  const second = measureOnce();
  const classify = (axis: Axis): string =>
    /NOT ESTABLISHED/.test(axis.evidence) ? 'not-established' : /SUPERLINEAR/.test(axis.evidence) ? 'superlinear' : 'linear';

  if (classify(first) !== classify(second)) {
    return {
      state: 'unmet',
      evidence:
        `NOT REPRODUCIBLE: two consecutive measurements disagreed — ` +
        `${classify(first)} then ${classify(second)}. ` +
        `First: ${first.evidence.replace(/^marginal over a no-op control: /, '')}`,
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
    throw new Error(`dist is older than src for eslint-plugin-${prefix} — run the build before auditing ${ruleId}`);
  }
  const mod = await import(path.join(pkg, 'dist/src/index.js'));
  const plugin = mod.default ?? mod;
  const throughput = throughputOf(ruleId, plugin.rules[ruleName], path.join(CORPUS, dir));

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
