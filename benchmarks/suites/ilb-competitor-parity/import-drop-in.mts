/**
 * import-drop-in.mts — how much of a drop-in replacement for
 * eslint-plugin-import is eslint-plugin-import-next, graded by
 * eslint-plugin-import's OWN test suite (PRINCIPLES.md: "drop-in compatibility
 * graded by the incumbent's own tests"; "measured or it is a slogan").
 *
 *   git clone --branch v2.32.0 https://github.com/import-js/eslint-plugin-import <dir>
 *   npx tsx benchmarks/suites/ilb-competitor-parity/import-drop-in.mts --upstream <dir>
 *   … --write    record benchmarks/results/ilb-import-parity/<date>.json
 *
 * Corpus: benchmarks/corpus/competitor-parity/eslint-plugin-import.json, every
 * RuleTester case of the pinned release (benchmarks/scripts/extract-import-cases.cjs).
 * The fixture files it names are read from the checkout, which must be at the
 * pinned commit.
 *
 * Scoring, per case, the rule under its upstream name (`import/<rule>`) with
 * the case's own options, settings, parser, filename and language options:
 *
 *   valid    passes when the rule reports nothing;
 *   invalid  passes when the rule reports exactly as many problems as the case
 *            expects. Messages, positions and autofix output are NOT compared
 *            — this is the "same verdict, same count" bar, not byte equality.
 *
 * A parse error fails the case. A rule that is not exported under the upstream
 * name fails every one of its cases: a config that says `import/<rule>` breaks.
 *
 * The control: eslint-plugin-import itself runs every case through the same
 * harness first. Only cases it passes here are graded. The rest depend on
 * something this harness does not reproduce — a parser upstream installs and
 * this repo does not (babel-eslint), a resolver plugin (webpack), packages in
 * upstream's own node_modules, files its mocha hooks write — and are reported
 * as excluded, by reason, not silently dropped. Excluding them can only make
 * the denominator smaller; it never turns an import-next failure into a pass.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import { getToolchain } from '../../lib/toolchain.ts';
import { captureMethodology } from '../../lib/methodology.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const CORPUS_REL =
  'benchmarks/corpus/competitor-parity/eslint-plugin-import.json';
const EXTRACTOR_REL = 'benchmarks/scripts/extract-import-cases.cjs';

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;

type Case = {
  rule: string;
  suite?: string;
  describe?: string;
  kind: 'valid' | 'invalid';
  i: number;
  setupHook?: boolean;
  code: string;
  filename: string | null;
  options?: unknown[];
  settings?: Record<string, unknown>;
  parser: string | null;
  sourceType: string;
  ecmaVersion: number | string;
  parserOptions?: Record<string, unknown>;
  errors: number;
};
const corpus = JSON.parse(
  fs.readFileSync(path.join(ROOT, CORPUS_REL), 'utf8'),
) as {
  source: { package: string; version: string; commit: string; tag: string };
  cases: Case[];
};

const UP = path.resolve(arg('--upstream') ?? '');
if (!arg('--upstream') || !fs.existsSync(path.join(UP, 'tests/files'))) {
  console.error(
    `usage: import-drop-in.mts --upstream <checkout of ${corpus.source.package} ${corpus.source.tag}>`,
  );
  process.exit(2);
}
const head = execFileSync('git', ['-C', UP, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
if (head !== corpus.source.commit) {
  console.error(
    `checkout is at ${head}; the corpus was captured at ${corpus.source.tag} (${corpus.source.commit})`,
  );
  process.exit(2);
}
const FIXTURES = path.join(UP, 'tests/files');

/**
 * `<fixtures>`/`<upstream>` back to this machine's checkout, deeply, and the
 * values JSON cannot hold (`{ $number }`, `{ $regexp }`) back to themselves.
 */
const untoken = (v: unknown): unknown => {
  if (typeof v === 'string')
    return v.split('<fixtures>').join(FIXTURES).split('<upstream>').join(UP);
  if (Array.isArray(v)) return v.map(untoken);
  if (v && typeof v === 'object' && '$number' in v)
    return Number((v as { $number: string }).$number);
  if (v && typeof v === 'object' && '$regexp' in v) {
    const r = v as { $regexp: string; flags: string };
    return new RegExp(r.$regexp, r.flags);
  }
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [untoken(k) as string, untoken(x)]),
    );
  return v;
};

/** Parsers the harness can load. Anything else: the case is not reproducible. */
const PARSERS: Record<string, unknown> = {
  espree: require('espree'),
  '@typescript-eslint/parser': require('@typescript-eslint/parser'),
};

type Plugin = { rules: Record<string, unknown> };
// eslint-plugin-import has no ESLint 10 release (import-js/eslint-plugin-import#3278):
// several of its rules call context/SourceCode methods ESLint 10 removed. The
// control runs it the way an ESLint 10 user has to — through @eslint/compat's
// fixupPluginRules — so a removed API is not mistaken for a case the harness
// cannot reproduce. import-next is run as published, with no shim.
const { fixupPluginRules } = require('@eslint/compat');
const subjects: Record<string, Plugin> = {
  'eslint-plugin-import': fixupPluginRules(require('eslint-plugin-import')),
  // The built package, as published: what a user's config would load.
  'eslint-plugin-import-next': require(
    path.join(ROOT, 'packages/eslint-plugin-import-next'),
  ),
};
const installedIncumbent = require('eslint-plugin-import/package.json').version;
if (installedIncumbent !== corpus.source.version) {
  console.error(
    `control needs eslint-plugin-import@${corpus.source.version}, found ${installedIncumbent}`,
  );
  process.exit(2);
}

/**
 * Why a case did not pass. The three wrong-count kinds are told apart because
 * they mean different things to a user: a finding on clean code, a silence on
 * bad code, and the right verdict with a different number of reports.
 */
type Outcome =
  | 'pass'
  | 'reports-valid' // valid case, rule reported something
  | 'misses-invalid' // invalid case, rule reported nothing
  | 'different-count' // invalid case, reported, but not as many times
  | 'options-rejected' // the rule's schema refuses the case's options: config load fails
  | 'parse-error'
  | 'crash'
  | 'not-implemented'
  | 'parser-unavailable';

/**
 * Mocha ran upstream's suite from the checkout root; so does the harness, and
 * `cwd` is what RuleTester's Linter gets too. RuleTester matches config from
 * the filesystem root, so a case may name a file outside the checkout
 * (`/foo/bar/index.js`); Linter matches from `cwd`, so those get a Linter
 * rooted at `/`.
 */
process.chdir(UP);
const linter = new Linter({ cwd: UP, configType: 'flat' });
const rootLinter = new Linter({ cwd: path.parse(UP).root, configType: 'flat' });

function run(
  subjectName: string,
  c: Case,
): { outcome: Outcome; got?: number; detail?: string } {
  const subject = subjects[subjectName];
  const rule = subject.rules[c.rule];
  if (!rule) return { outcome: 'not-implemented' };
  let parser: unknown;
  if (c.parser) {
    parser = PARSERS[c.parser];
    if (!parser) return { outcome: 'parser-unavailable', detail: c.parser };
  }
  const config = {
    // Every file, extensionless ones included (`**/*` alone does not count as
    // a match in flat config).
    files: [() => true],
    plugins: { import: { rules: { [c.rule]: rule } } },
    languageOptions: {
      ecmaVersion: c.ecmaVersion,
      sourceType: c.sourceType,
      ...(parser ? { parser } : {}),
      ...(c.parserOptions ? { parserOptions: untoken(c.parserOptions) } : {}),
    },
    ...(c.settings ? { settings: untoken(c.settings) } : {}),
    rules: {
      [`import/${c.rule}`]: [
        'error',
        ...(untoken(c.options ?? []) as unknown[]),
      ],
    },
  };
  const filename = c.filename ? (untoken(c.filename) as string) : undefined;
  const inTree =
    !filename ||
    !path.isAbsolute(filename) ||
    filename.startsWith(UP + path.sep);
  try {
    const messages = (inTree ? linter : rootLinter).verify(
      untoken(c.code) as string,
      config as never,
      // No filename: Linter's `<input>`, as in RuleTester.
      filename ? { filename } : undefined,
    );
    const fatal = messages.find((m) => m.fatal || !m.ruleId);
    if (fatal) return { outcome: 'parse-error', detail: fatal.message };
    const got = messages.filter((m) => m.ruleId === `import/${c.rule}`).length;
    const expected = c.kind === 'valid' ? 0 : c.errors;
    if (got === expected) return { outcome: 'pass', got };
    return {
      outcome:
        c.kind === 'valid'
          ? 'reports-valid'
          : got === 0
            ? 'misses-invalid'
            : 'different-count',
      got,
    };
  } catch (e) {
    const message = String((e as Error).message);
    // ESLint's config validation: `Key "rules": Key "import/x": <why>`.
    if (message.startsWith('Key "rules"'))
      return {
        outcome: 'options-rejected',
        detail: message
          .split('\n')
          .slice(1)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160),
      };
    return { outcome: 'crash', detail: message.split('\n')[0].slice(0, 300) };
  }
}

// ── grade ───────────────────────────────────────────────────────────────
type Row = {
  rule: string;
  implemented: boolean;
  cases: number;
  graded: number;
  passed: number;
  validGraded: number;
  validPassed: number;
  invalidGraded: number;
  invalidPassed: number;
  excluded: Record<string, number>;
  failures: Record<string, number>;
  /**
   * Informational, never in the headline: excluded cases run through
   * import-next anyway and checked against upstream's expectation. Nothing
   * vouches for the harness on these, so they are reported, not scored.
   */
  ungraded: { ran: number; matchedUpstream: number };
};
const rows = new Map<string, Row>();
const failing: {
  id: number;
  rule: string;
  kind: string;
  i: number;
  suite?: string;
  describe?: string;
  outcome: Outcome;
  expected: number;
  got?: number;
  detail?: string;
}[] = [];

for (const [id, c] of corpus.cases.entries()) {
  if (!rows.has(c.rule))
    rows.set(c.rule, {
      rule: c.rule,
      implemented: Boolean(subjects['eslint-plugin-import-next'].rules[c.rule]),
      cases: 0,
      graded: 0,
      passed: 0,
      validGraded: 0,
      validPassed: 0,
      invalidGraded: 0,
      invalidPassed: 0,
      excluded: {},
      failures: {},
      ungraded: { ran: 0, matchedUpstream: 0 },
    });
  const row = rows.get(c.rule)!;
  row.cases++;
  const control = run('eslint-plugin-import', c);
  if (control.outcome !== 'pass') {
    const reason =
      control.outcome === 'parser-unavailable'
        ? `parser ${control.detail} not installed`
        : `incumbent ${control.outcome} in harness`;
    row.excluded[reason] = (row.excluded[reason] ?? 0) + 1;
    if (control.outcome !== 'parser-unavailable') {
      const r = run('eslint-plugin-import-next', c);
      row.ungraded.ran++;
      if (r.outcome === 'pass') row.ungraded.matchedUpstream++;
    }
    continue;
  }
  row.graded++;
  if (c.kind === 'valid') row.validGraded++;
  else row.invalidGraded++;
  const r = run('eslint-plugin-import-next', c);
  if (r.outcome === 'pass') {
    row.passed++;
    if (c.kind === 'valid') row.validPassed++;
    else row.invalidPassed++;
  } else {
    row.failures[r.outcome] = (row.failures[r.outcome] ?? 0) + 1;
    failing.push({
      id,
      rule: c.rule,
      kind: c.kind,
      i: c.i,
      ...(c.suite ? { suite: c.suite } : {}),
      ...(c.describe ? { describe: c.describe } : {}),
      outcome: r.outcome,
      expected: c.kind === 'valid' ? 0 : c.errors,
      ...(r.got !== undefined ? { got: r.got } : {}),
      ...(r.detail ? { detail: r.detail } : {}),
    });
  }
}

const table = [...rows.values()].sort((a, b) => a.rule.localeCompare(b.rule));
const sum = (f: (r: Row) => number, rs = table) =>
  rs.reduce((s, r) => s + f(r), 0);
const implemented = table.filter((r) => r.implemented);
const headline = {
  passed: sum((r) => r.passed),
  graded: sum((r) => r.graded),
  captured: corpus.cases.length,
  excluded: corpus.cases.length - sum((r) => r.graded),
  rules: table.length,
  rulesNotImplemented: table.filter((r) => !r.implemented).map((r) => r.rule),
  rulesFullyPassing: table.filter(
    (r) => r.implemented && r.graded > 0 && r.passed === r.graded,
  ).length,
  implementedRulesPassed: sum((r) => r.passed, implemented),
  implementedRulesGraded: sum((r) => r.graded, implemented),
  /** Graded cases that did not pass, by why. Sums to graded − passed. */
  failuresByOutcome: Object.fromEntries(
    [...new Set(table.flatMap((r) => Object.keys(r.failures)))]
      .sort()
      .map((k) => [k, sum((r) => r.failures[k] ?? 0)]),
  ),
  /**
   * The looser bar, for context only: flag/no-flag agrees (a different number
   * of reports on a case that should report still counts).
   */
  verdictAgrees: sum((r) => r.passed + (r.failures['different-count'] ?? 0)),
  ungradedRan: sum((r) => r.ungraded.ran),
  ungradedMatchedUpstream: sum((r) => r.ungraded.matchedUpstream),
};
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '—');

console.log(
  `import drop-in — eslint-plugin-import-next vs ${corpus.source.package}@${corpus.source.version} (${corpus.cases.length} cases)\n`,
);
for (const r of [...table].sort(
  (a, b) => a.passed / (a.graded || 1) - b.passed / (b.graded || 1),
)) {
  const fails = Object.entries(r.failures)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  console.log(
    `  ${r.rule.padEnd(32)} ${String(r.passed).padStart(4)}/${String(r.graded).padEnd(4)} ${pct(r.passed, r.graded).padStart(5)}%  ${r.implemented ? '' : 'NOT IMPLEMENTED '}${fails}`,
  );
}
console.log(
  `\n  passed ${headline.passed}/${headline.graded} graded cases (${pct(headline.passed, headline.graded)}%)`,
);
console.log(
  `  implemented rules only: ${headline.implementedRulesPassed}/${headline.implementedRulesGraded} (${pct(headline.implementedRulesPassed, headline.implementedRulesGraded)}%)`,
);
console.log(
  `  excluded (incumbent does not reproduce in this harness): ${headline.excluded}/${headline.captured}`,
);
console.log(
  `  not implemented: ${headline.rulesNotImplemented.join(', ') || 'none'}`,
);
console.log(
  `  failures by outcome: ${JSON.stringify(headline.failuresByOutcome)}`,
);
console.log(
  `  verdict agrees (looser, count ignored): ${headline.verdictAgrees}/${headline.graded} (${pct(headline.verdictAgrees, headline.graded)}%)`,
);
console.log(
  `  ungraded, informational: import-next matches upstream on ${headline.ungradedMatchedUpstream}/${headline.ungradedRan} excluded cases it could run`,
);

if (args.includes('--write')) {
  const now = new Date();
  const out = path.join(
    ROOT,
    'benchmarks/results/ilb-import-parity',
    `${now.toISOString().slice(0, 10)}.json`,
  );
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const excludedByReason: Record<string, number> = {};
  for (const r of table)
    for (const [k, v] of Object.entries(r.excluded))
      excludedByReason[k] = (excludedByReason[k] ?? 0) + v;
  fs.writeFileSync(
    out,
    JSON.stringify(
      {
        suite: 'ilb-import-parity',
        version: '1.0',
        bench: 'ILB-Drop-In',
        benchVersion: '0.1',
        timestamp: now.toISOString(),
        toolchain: getToolchain(),
        ...captureMethodology(import.meta.url, [EXTRACTOR_REL, CORPUS_REL]),
        command: `npx tsx benchmarks/suites/ilb-competitor-parity/import-drop-in.mts --upstream <${corpus.source.tag} checkout> --write`,
        subject: `eslint-plugin-import-next@${require(path.join(ROOT, 'packages/eslint-plugin-import-next/package.json')).version}`,
        incumbent: `${corpus.source.package}@${corpus.source.version}`,
        control: `${corpus.source.package}@${corpus.source.version} via @eslint/compat@${JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('@eslint/compat')), '../../package.json'), 'utf8')).version} fixupPluginRules`,
        upstreamCommit: corpus.source.commit,
        corpus: CORPUS_REL,
        scoring:
          'valid: rule reports nothing; invalid: rule reports exactly the expected number of problems. Messages, positions and fixes are not compared. Graded = cases eslint-plugin-import itself passes in this harness.',
        headline,
        excludedByReason,
        rules: table,
        failing,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`\nwrote ${path.relative(ROOT, out)}`);
}
