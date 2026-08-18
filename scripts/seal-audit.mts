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
 * Throughput, per rule, at three sizes.
 *
 * The input is the rule's OWN corpus concatenated to length: representative code
 * for this rule rather than a synthetic file it would skip in one pass. What
 * matters is the SHAPE of the curve — a rule whose 8000-line time is roughly 16x
 * its 500-line time is quadratic, and that is a defect however small the
 * absolute numbers look on a laptop.
 */
const throughputOf = (ruleId: string, rule: unknown, dir: string): Axis => {
  const [, ruleName] = ruleId.split('/');
  const files = ['vulnerable', 'safe']
    .flatMap((sub) => {
      const full = path.join(dir, sub);
      return fs.existsSync(full)
        ? fs.readdirSync(full).map((f) => fs.readFileSync(path.join(full, f), 'utf8'))
        : [];
    })
    .join('\n');
  if (!files.trim()) {
    return { state: 'unmet', evidence: 'no corpus fixtures to time against', command: 'npx tsx scripts/seal-audit.mts' };
  }
  const unit = files.split('\n');
  const linter = new Linter({ configType: 'flat' });
  const config = [
    {
      files: ['**/*.ts'],
      languageOptions: { parser: tsParser, ecmaVersion: 2022 as const, sourceType: 'module' as const },
      plugins: { probe: { rules: { [ruleName]: rule } } },
      rules: { [`probe/${ruleName}`]: 'error' as const },
    },
  ];
  const timings: string[] = [];
  const times: number[] = [];
  for (const target of [500, 2000, 8000]) {
    const lines: string[] = [];
    while (lines.length < target) lines.push(...unit);
    const source = lines.slice(0, target).join('\n');
    // One warm-up pass so the first measurement is not paying for JIT.
    linter.verify(source, config, 'perf.ts');
    const started = process.hrtime.bigint();
    linter.verify(source, config, 'perf.ts');
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    times.push(ms);
    timings.push(`${target}L ${ms.toFixed(1)}ms`);
  }
  // 16x the lines; a linear rule lands well under 16x the time.
  const growth = times[0] > 0 ? times[2] / times[0] : Infinity;
  const linear = growth < 24;
  return {
    state: linear ? 'met' : 'unmet',
    evidence: `${timings.join(' · ')} — ${growth.toFixed(1)}x time for 16x lines, ${linear ? 'linear' : 'SUPERLINEAR'}`,
    command: `npx tsx scripts/seal-audit.mts ${ruleId}`,
  };
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
    const unreviewed = ledger.cases.filter((c) => c.verdict === 'unreviewed').length;
    realSource = {
      state: unreviewed === 0 && ledger.cases.length > 0 ? 'met' : 'unmet',
      evidence: `${ledger.cases.length} case(s) filed, ${unreviewed} still unreviewed`,
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
  let coverage: Axis = keep('coverage') ?? { state: 'unmet', evidence: 'not measured', command: '' };
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
