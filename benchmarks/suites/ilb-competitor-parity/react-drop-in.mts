/**
 * react-drop-in.mts — how much of a drop-in replacement for eslint-plugin-react
 * is eslint-plugin-react-features, graded by eslint-plugin-react's OWN test
 * suite (PRINCIPLES.md: "drop-in compatibility graded by the incumbent's own
 * tests"; "measured or it is a slogan"). Sibling of import-drop-in.mts.
 *
 *   git clone --branch v7.37.5 https://github.com/jsx-eslint/eslint-plugin-react <dir>
 *   npm run build -w packages/eslint-plugin-react-features     # a local build, never npm
 *   npx tsx benchmarks/suites/ilb-competitor-parity/react-drop-in.mts --upstream <dir>
 *   … --write    record benchmarks/results/ilb-react-parity/<date>.json
 *
 * Corpus: benchmarks/corpus/competitor-parity/eslint-plugin-react.json, every
 * RuleTester case of the pinned release (benchmarks/scripts/extract-react-cases.cjs).
 * The fixture files it names are read from the checkout, which must be at the
 * pinned commit.
 *
 * Scoring, per case, the rule under its upstream name (`react/<rule>`) with the
 * case's own options, settings, parser, filename, globals and language options:
 *
 *   valid    passes when the rule reports nothing;
 *   invalid  passes when the rule reports exactly as many problems as the case
 *            expects. Messages, positions and fixes are NOT part of the grade
 *            ("same verdict, same count"); a second, informational figure
 *            counts how many passing invalid cases also agree on messageId /
 *            message text.
 *
 * Harness adapters (each one is a decision, listed so nobody has to guess):
 *
 *   A1  plugin key. react-features exports its rules under flat names
 *       (`jsx-key`) and `react/jsx-key`. The harness registers
 *       `{ rules: reactFeatures.rules }` as the plugin `react` and enables
 *       `react/<rule>`, which resolves to the flat name. This is what an alias
 *       install (`"eslint-plugin-react": "npm:eslint-plugin-react-features"`)
 *       would give a user config. The `react-features/` prefix our own presets
 *       use is not exercised.
 *   A2  settings. Passed through unchanged under `settings.react`. react-features
 *       reads no `settings.react` today, so cases that depend on `version`,
 *       `pragma`, `fragment` or the wrapper-function settings are counted as
 *       failures and tagged `settings.react.<key>`; the tag is an upper bound
 *       on "caused by settings", not a diagnosis.
 *   A3  legacy to flat. Upstream's helper turns `parserOptions`/`parser`/
 *       `globals` into flat `languageOptions`, defaulting ecmaVersion 5 and
 *       sourceType 'script'. The corpus keeps the resolved values; the harness
 *       puts them in `languageOptions` the same way.
 *   A4  core rules. Three upstream suites run an ESLint core rule with a react
 *       rule switched on in a comment. Cases carry `coreRule`; the harness
 *       enables it next to the react rule. (react-features lacks all three
 *       react rules, so these are 'not-implemented' either way.)
 *   A5  parsers. espree (default) and @typescript-eslint/parser only; the
 *       babel and pre-2018 TypeScript parsers upstream also fans out to are
 *       not installed, so those cases are counted in the corpus header and
 *       never graded.
 *
 * The control: eslint-plugin-react@7.37.5 itself runs every case through the
 * same harness first, on the same ESLint 10, through @eslint/compat's
 * fixupPluginRules (it has no ESLint 10 release; its tracker is locked). Only
 * cases it passes here are graded. The rest depend on something this harness
 * does not reproduce, or on an API ESLint 10 removed, and are reported as
 * excluded, by reason. Excluding them can only make the denominator smaller;
 * it never turns a react-features failure into a pass.
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
  'benchmarks/corpus/competitor-parity/eslint-plugin-react.json';
const EXTRACTOR_REL = 'benchmarks/scripts/extract-react-cases.cjs';
const SUBJECT_REL = 'packages/eslint-plugin-react-features';

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : undefined;

type Case = {
  rule: string;
  coreRule?: string;
  kind: 'valid' | 'invalid';
  i: number;
  code: string;
  filename: string | null;
  options?: unknown[];
  settings?: Record<string, unknown>;
  parser: string | null;
  sourceType: string;
  ecmaVersion: number | string;
  parserOptions?: Record<string, unknown>;
  globals?: Record<string, unknown>;
  errors: number;
  messages?: { messageId?: string; message?: string }[];
};
const corpus = JSON.parse(
  fs.readFileSync(path.join(ROOT, CORPUS_REL), 'utf8'),
) as {
  source: { package: string; version: string; commit: string; tag: string };
  counts: { capturedBeforeParserFilter: number; defaultParser: number };
  cases: Case[];
};

const UP = path.resolve(arg('--upstream') ?? '');
if (!arg('--upstream') || !fs.existsSync(path.join(UP, 'tests/fixtures'))) {
  console.error(
    `usage: react-drop-in.mts --upstream <checkout of ${corpus.source.package} ${corpus.source.tag}>`,
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
const FIXTURES = path.join(UP, 'tests/fixtures');

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

const PARSERS: Record<string, unknown> = {
  '@typescript-eslint/parser': require('@typescript-eslint/parser'),
};

type Plugin = { rules: Record<string, unknown> };
const { fixupPluginRules } = require('@eslint/compat');
const SUBJECT_PKG = JSON.parse(
  fs.readFileSync(path.join(ROOT, SUBJECT_REL, 'package.json'), 'utf8'),
) as { version: string };
const subjectBuild = path.join(ROOT, SUBJECT_REL, 'dist/src/index.js');
if (!fs.existsSync(subjectBuild)) {
  console.error(
    `no local build at ${path.relative(ROOT, subjectBuild)}; run the package's build first (never npm)`,
  );
  process.exit(2);
}
const subjects: Record<string, Plugin> = {
  'eslint-plugin-react': fixupPluginRules(require('eslint-plugin-react')),
  // The built package, as published: what a user's config would load. (A1)
  'eslint-plugin-react-features': { rules: require(subjectBuild).rules },
};
const installedIncumbent = require('eslint-plugin-react/package.json').version;
if (installedIncumbent !== corpus.source.version) {
  console.error(
    `control needs eslint-plugin-react@${corpus.source.version}, found ${installedIncumbent}`,
  );
  process.exit(2);
}
const recommended = Object.keys(
  require('eslint-plugin-react').configs.recommended.rules,
).map((k: string) => k.replace(/^react\//, ''));

type Outcome =
  | 'pass'
  | 'reports-valid'
  | 'misses-invalid'
  | 'different-count'
  | 'options-rejected'
  | 'parse-error'
  | 'crash'
  | 'not-implemented'
  | 'parser-unavailable';

process.chdir(UP);
const linter = new Linter({ cwd: UP, configType: 'flat' });
const rootLinter = new Linter({ cwd: path.parse(UP).root, configType: 'flat' });

type Msg = { ruleId: string | null; messageId?: string; message: string };
type Run = {
  outcome: Outcome;
  got?: number;
  detail?: string;
  messages?: Msg[];
};

function run(subjectName: string, c: Case): Run {
  const subject = subjects[subjectName];
  const rule = subject.rules[c.rule];
  if (!rule) return { outcome: 'not-implemented' };
  let parser: unknown;
  if (c.parser) {
    parser = PARSERS[c.parser];
    if (!parser) return { outcome: 'parser-unavailable', detail: c.parser };
  }
  const config = {
    files: [() => true],
    plugins: { react: { rules: { [c.rule]: rule } } },
    languageOptions: {
      ecmaVersion: c.ecmaVersion,
      sourceType: c.sourceType,
      ...(parser ? { parser } : {}),
      ...(c.parserOptions ? { parserOptions: untoken(c.parserOptions) } : {}),
      ...(c.globals ? { globals: untoken(c.globals) } : {}),
    },
    ...(c.settings ? { settings: untoken(c.settings) } : {}),
    rules: {
      [`react/${c.rule}`]: [
        'error',
        ...(untoken(c.options ?? []) as unknown[]),
      ],
      // A4: some suites enable a core rule and switch the react rule on inline.
      ...(c.coreRule ? { [c.coreRule]: 'error' } : {}),
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
      filename ? { filename } : undefined,
    );
    const fatal = messages.find((m) => m.fatal || !m.ruleId);
    if (fatal) return { outcome: 'parse-error', detail: fatal.message };
    const mine = messages.filter((m) =>
      c.coreRule ? true : m.ruleId === `react/${c.rule}`,
    );
    const got = mine.length;
    const expected = c.kind === 'valid' ? 0 : c.errors;
    if (got === expected) return { outcome: 'pass', got, messages: mine };
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

/** Informational: do the reports carry the messageIds / texts upstream expects? */
function messagesAgree(c: Case, got: Msg[]): boolean | undefined {
  if (c.kind !== 'invalid' || !c.messages) return undefined;
  const ids = c.messages.filter((m) => m.messageId).map((m) => m.messageId!);
  if (ids.length === c.messages.length)
    return (
      JSON.stringify([...ids].sort()) ===
      JSON.stringify(got.map((m) => m.messageId ?? '').sort())
    );
  const texts = c.messages.filter((m) => m.message).map((m) => m.message!);
  if (texts.length === c.messages.length)
    return (
      JSON.stringify([...texts].sort()) ===
      JSON.stringify(got.map((m) => m.message).sort())
    );
  return undefined; // a mix: not comparable
}

/** What a failing case carries that could explain it. Tags, not diagnoses. */
function tagsOf(c: Case): string[] {
  const tags: string[] = [];
  const react = (c.settings as { react?: Record<string, unknown> } | undefined)
    ?.react;
  if (react && typeof react === 'object')
    for (const k of Object.keys(react).sort()) tags.push(`settings.react.${k}`);
  else if (c.settings) tags.push('settings.other');
  if (c.options && c.options.length) tags.push('options');
  if (c.parser === '@typescript-eslint/parser') tags.push('ts-parser');
  return tags;
}
const classOf = (outcome: Outcome, tags: string[]): string => {
  const settings = tags.find((t) => t.startsWith('settings.react.'));
  const verdict = ['reports-valid', 'misses-invalid', 'different-count'];
  if (verdict.includes(outcome)) {
    const base = outcome === 'reports-valid' ? 'reports-valid' : 'wrong-count';
    if (settings) return `${base} · case sets settings.react`;
    if (tags.includes('options')) return `${base} · case sets options`;
    return `${base} · plain`;
  }
  return outcome;
};

// ── grade ───────────────────────────────────────────────────────────────
type Row = {
  rule: string;
  implemented: boolean;
  recommended: boolean;
  cases: number;
  graded: number;
  passed: number;
  validGraded: number;
  validPassed: number;
  invalidGraded: number;
  invalidPassed: number;
  messageComparable: number;
  messageAgrees: number;
  excluded: Record<string, number>;
  failures: Record<string, number>;
  failureClasses: Record<string, number>;
  ungraded: { ran: number; matchedUpstream: number };
};
const rows = new Map<string, Row>();
const failing: {
  id: number;
  rule: string;
  kind: string;
  i: number;
  outcome: Outcome;
  class: string;
  tags: string[];
  parser: string | null;
  expected: number;
  got?: number;
  detail?: string;
}[] = [];

for (const [id, c] of corpus.cases.entries()) {
  if (!rows.has(c.rule))
    rows.set(c.rule, {
      rule: c.rule,
      implemented: Boolean(
        subjects['eslint-plugin-react-features'].rules[c.rule],
      ),
      recommended: recommended.includes(c.rule),
      cases: 0,
      graded: 0,
      passed: 0,
      validGraded: 0,
      validPassed: 0,
      invalidGraded: 0,
      invalidPassed: 0,
      messageComparable: 0,
      messageAgrees: 0,
      excluded: {},
      failures: {},
      failureClasses: {},
      ungraded: { ran: 0, matchedUpstream: 0 },
    });
  const row = rows.get(c.rule)!;
  row.cases++;
  const control = run('eslint-plugin-react', c);
  if (control.outcome !== 'pass') {
    const reason =
      control.outcome === 'parser-unavailable'
        ? `parser ${control.detail} not installed`
        : `incumbent ${control.outcome} in harness`;
    row.excluded[reason] = (row.excluded[reason] ?? 0) + 1;
    if (control.outcome !== 'parser-unavailable') {
      const r = run('eslint-plugin-react-features', c);
      row.ungraded.ran++;
      if (r.outcome === 'pass') row.ungraded.matchedUpstream++;
    }
    continue;
  }
  row.graded++;
  if (c.kind === 'valid') row.validGraded++;
  else row.invalidGraded++;
  const r = run('eslint-plugin-react-features', c);
  if (r.outcome === 'pass') {
    row.passed++;
    if (c.kind === 'valid') row.validPassed++;
    else {
      row.invalidPassed++;
      const agree = messagesAgree(c, r.messages ?? []);
      if (agree !== undefined) {
        row.messageComparable++;
        if (agree) row.messageAgrees++;
      }
    }
  } else {
    const tags = tagsOf(c);
    const cls = classOf(r.outcome, tags);
    row.failures[r.outcome] = (row.failures[r.outcome] ?? 0) + 1;
    row.failureClasses[cls] = (row.failureClasses[cls] ?? 0) + 1;
    failing.push({
      id,
      rule: c.rule,
      kind: c.kind,
      i: c.i,
      outcome: r.outcome,
      class: cls,
      tags,
      parser: c.parser,
      expected: c.kind === 'valid' ? 0 : c.errors,
      ...(r.got !== undefined ? { got: r.got } : {}),
      ...(r.detail ? { detail: r.detail } : {}),
    });
  }
}

const table = [...rows.values()].sort((a, b) => a.rule.localeCompare(b.rule));
const sum = (f: (r: Row) => number, rs = table) =>
  rs.reduce((s, r) => s + f(r), 0);
const merge = (rs: Row[], pick: (r: Row) => Record<string, number>) => {
  const out: Record<string, number> = {};
  for (const r of rs)
    for (const [k, v] of Object.entries(pick(r))) out[k] = (out[k] ?? 0) + v;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
};
const summarize = (rs: Row[]) => ({
  rules: rs.length,
  rulesImplemented: rs.filter((r) => r.implemented).length,
  rulesNotImplemented: rs.filter((r) => !r.implemented).map((r) => r.rule),
  rulesFullyPassing: rs.filter(
    (r) => r.implemented && r.graded > 0 && r.passed === r.graded,
  ).length,
  // Every graded case of every rule in the set; a rule react-features does
  // not export fails all of its graded cases. This is the drop-in number.
  passed: sum((r) => r.passed, rs),
  graded: sum((r) => r.graded, rs),
  // Only the rules react-features exports under the upstream name.
  implementedPassed: sum(
    (r) => r.passed,
    rs.filter((r) => r.implemented),
  ),
  implementedGraded: sum(
    (r) => r.graded,
    rs.filter((r) => r.implemented),
  ),
  captured: sum((r) => r.cases, rs),
  excluded: sum((r) => r.cases - r.graded, rs),
  invalidMessageComparable: sum((r) => r.messageComparable, rs),
  invalidMessageAgrees: sum((r) => r.messageAgrees, rs),
  failuresByOutcome: merge(rs, (r) => r.failures),
  failureClasses: merge(rs, (r) => r.failureClasses),
});
const implemented = table.filter((r) => r.implemented);
const headline = {
  all103Rules: summarize(table),
  sharedNames: summarize(implemented),
  recommended22: summarize(table.filter((r) => r.recommended)),
  recommendedImplemented: summarize(
    table.filter((r) => r.recommended && r.implemented),
  ),
  /** Same grading, default parser only (espree), no TypeScript-parser fan-out. */
  defaultParserOnly: undefined as unknown,
  ungradedRan: sum((r) => r.ungraded.ran),
  ungradedMatchedUpstream: sum((r) => r.ungraded.matchedUpstream),
};
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '—');

// Default-parser-only view: recount from the failing list.
{
  const defaultIds = new Set(
    corpus.cases.flatMap((c, id) => (c.parser === null ? [id] : [])),
  );
  const failDefault = failing.filter((f) => defaultIds.has(f.id)).length;
  // graded default-parser cases need the control outcome; recomputed cheaply.
  let gradedDefault = 0;
  for (const id of defaultIds) {
    const c = corpus.cases[id];
    if (run('eslint-plugin-react', c).outcome === 'pass') gradedDefault++;
  }
  headline.defaultParserOnly = {
    graded: gradedDefault,
    passed: gradedDefault - failDefault,
  };
}

console.log(
  `react drop-in — eslint-plugin-react-features@${SUBJECT_PKG.version} vs ${corpus.source.package}@${corpus.source.version} (${corpus.cases.length} gradeable of ${corpus.counts.capturedBeforeParserFilter} captured cases)\n`,
);
for (const r of [...table].sort(
  (a, b) => a.passed / (a.graded || 1) - b.passed / (b.graded || 1),
)) {
  const fails = Object.entries(r.failures)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
  console.log(
    `  ${(r.recommended ? '*' : ' ') + r.rule.padEnd(40)} ${String(r.passed).padStart(4)}/${String(r.graded).padEnd(4)} ${pct(r.passed, r.graded).padStart(5)}%  ${r.implemented ? '' : 'NOT IMPLEMENTED '}${fails}`,
  );
}
for (const [name, s] of [
  ['recommended (22, missing rules count as failures)', headline.recommended22],
  ['recommended, implemented rules only', headline.recommendedImplemented],
  ['shared names (rules we export)', headline.sharedNames],
  ['all 103 upstream rules', headline.all103Rules],
] as const)
  console.log(
    `\n  ${name}: ${s.passed}/${s.graded} (${pct(s.passed, s.graded)}%), excluded ${s.excluded}/${s.captured}, ${s.rulesFullyPassing} rules fully passing`,
  );
console.log(
  `  default parser only: ${(headline.defaultParserOnly as { passed: number; graded: number }).passed}/${(headline.defaultParserOnly as { graded: number }).graded}`,
);

if (!args.includes('--no-write')) {
  const now = new Date();
  const out = path.join(
    ROOT,
    'benchmarks/results/ilb-react-parity',
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
        suite: 'ilb-react-parity',
        version: '1.0',
        bench: 'ILB-Drop-In',
        benchVersion: '0.1',
        timestamp: now.toISOString(),
        toolchain: getToolchain(),
        ...captureMethodology(import.meta.url, [EXTRACTOR_REL, CORPUS_REL]),
        command: `npx tsx benchmarks/suites/ilb-competitor-parity/react-drop-in.mts --upstream <${corpus.source.tag} checkout>`,
        subject: `eslint-plugin-react-features@${SUBJECT_PKG.version} (local build)`,
        incumbent: `${corpus.source.package}@${corpus.source.version}`,
        control: `${corpus.source.package}@${corpus.source.version} via @eslint/compat@${JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('@eslint/compat')), '../../package.json'), 'utf8')).version} fixupPluginRules, on eslint@${require('eslint/package.json').version}`,
        upstreamCommit: corpus.source.commit,
        corpus: CORPUS_REL,
        scoring:
          'valid: rule reports nothing; invalid: rule reports exactly the expected number of problems. Messages, positions and fixes are not compared in the grade (message agreement is reported separately). Graded = cases eslint-plugin-react itself passes in this harness. Adapters A1-A5: see the suite header.',
        recommendedSet: recommended,
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
