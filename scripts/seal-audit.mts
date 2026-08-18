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
const throughputOf = (ruleId: string, rule: unknown, dir: string): Axis => {
  const [, ruleName] = ruleId.split('/');
  const fixtures = ['vulnerable', 'safe']
    .flatMap((sub) => {
      const full = path.join(dir, sub);
      return fs.existsSync(full)
        ? fs.readdirSync(full).map((f) => fs.readFileSync(path.join(full, f), 'utf8'))
        : [];
    })
    .join('\n');
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
      files: ['**/*.ts'],
      languageOptions: { parser: tsParser, ecmaVersion: 2022 as const, sourceType: 'module' as const },
      plugins: { probe: { rules: { [ruleName]: r } } },
      rules: { [`probe/${ruleName}`]: 'error' as const },
    },
  ];
  const noop = { create: () => ({}) };

  const PASSES = 5;
  const best = (r: unknown, source: string): number => {
    const config = configFor(r);
    linter.verify(source, config, 'perf.ts');
    let min = Infinity;
    for (let pass = 0; pass < PASSES; pass += 1) {
      const started = process.hrtime.bigint();
      linter.verify(source, config, 'perf.ts');
      min = Math.min(min, Number(process.hrtime.bigint() - started) / 1e6);
    }
    return min;
  };

  const marginal: number[] = [];
  const timings: string[] = [];
  for (const target of [500, 2000, 8000]) {
    const lines: string[] = [];
    while (lines.length < target) lines.push(...unit);
    const source = lines.slice(0, target).join('\n');
    const cost = Math.max(0, best(rule, source) - best(noop, source));
    marginal.push(cost);
    timings.push(`${target}L +${cost.toFixed(2)}ms`);
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
  const SIZES = [500, 2000, 8000];
  const NOISE_FLOOR_MS = 0.2;
  let verdict: Axis;
  let index = SIZES.length - 2;
  while (index >= 0 && marginal[index] < NOISE_FLOOR_MS) index -= 1;

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
        `fewer than two sizes clear the ${NOISE_FLOOR_MS}ms floor, so no growth curve can be read`,
      command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
    };
  } else {
    const lineRatio = SIZES[index + 1] / SIZES[index];
    const growth = marginal[index + 1] / marginal[index];
    // 1.6x headroom over the line ratio absorbs measurement noise without
    // absorbing an order of growth.
    const linear = growth <= lineRatio * 1.6;
    verdict = {
      state: linear ? 'met' : 'unmet',
      evidence:
        `marginal over a no-op control: ${timings.join(' · ')} — ` +
        `${growth.toFixed(1)}x time for ${lineRatio}x lines (${SIZES[index]}→${SIZES[index + 1]}), ` +
        `${linear ? 'linear' : 'SUPERLINEAR'}`,
      command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
    };
  }
  return verdict;
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
  const mod = await import(path.join(ROOT, 'packages', `eslint-plugin-${prefix}`, 'dist/src/index.js'));
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
