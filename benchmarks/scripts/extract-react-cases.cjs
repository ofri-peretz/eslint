/**
 * extract-react-cases.cjs — capture eslint-plugin-react's OWN RuleTester suite
 * as data, so eslint-plugin-react-features can be graded by the incumbent's
 * tests (PRINCIPLES.md: "drop-in compatibility graded by the incumbent's own
 * tests"). Sibling of extract-import-cases.cjs; same method.
 *
 *   git clone --branch v7.37.5 https://github.com/jsx-eslint/eslint-plugin-react <dir>
 *   node benchmarks/scripts/extract-react-cases.cjs <dir>
 *
 * The checkout must be at the pinned tag (PINNED below); the script refuses any
 * other commit, so the corpus is reproducible byte for byte.
 *
 * Every tests/lib/rules/*.js is executed with the suite's RuleTester helper
 * replaced by a recorder, so each case is captured exactly as upstream builds
 * it — including `parsers.all()`'s per-parser fan-out and its version gates —
 * rather than parsed out of the source. Differences from the import capture:
 *
 *   - Upstream is CommonJS, so no transpile step. Its `lib/` is not run from
 *     the checkout (that needs upstream's dependencies installed); a request
 *     for `<checkout>/lib/**` resolves to the same file of the installed
 *     eslint-plugin-react@7.37.5 npm package, which is the same release.
 *   - Version gates are evaluated as ESLint 9 (EMULATED_ESLINT), the newest
 *     major 7.37.5 supports; its suite has no ESLint 10 branch.
 *   - Upstream's helper turns legacy test items (`parserOptions`, `parser`,
 *     `globals`) into flat ones. The recorder captures the legacy shape and
 *     the grader does the same conversion, with the same defaults
 *     (ecmaVersion 5, sourceType 'script').
 *   - Three suites run an ESLint core rule (`no-unused-vars`, `prefer-const`)
 *     with a react rule enabled inline; those cases carry `coreRule`, and
 *     `rule` is the react rule the test file is named for.
 *   - Parsers are recorded by package name. `babel-eslint`,
 *     `@babel/eslint-parser` and `typescript-eslint-parser` (the pre-2018 TS
 *     parser) are not installed here: cases that ask for them are kept and
 *     graded as not reproducible.
 *   - Fixture files are NOT copied; the grader reads them from a checkout of
 *     the same pinned commit.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PINNED = {
  package: 'eslint-plugin-react',
  version: '7.37.5',
  tag: 'v7.37.5',
  commit: '2c98b83c451a4297edf1787d9a616e50687e27e8',
};
const EMULATED_ESLINT = '9.39.1';

const ROOT = path.resolve(__dirname, '../..');
const UP = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(UP, 'tests/lib/rules'))) {
  console.error(
    'usage: extract-react-cases.cjs <eslint-plugin-react checkout>',
  );
  process.exit(2);
}
const head = execFileSync('git', ['-C', UP, 'rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
if (head !== PINNED.commit) {
  console.error(
    `checkout is at ${head}, expected ${PINNED.tag} (${PINNED.commit})`,
  );
  process.exit(2);
}
const FIXTURES = path.join(UP, 'tests/fixtures');
const rootRequire = Module.createRequire(path.join(ROOT, 'package.json'));
if (rootRequire('eslint-plugin-react/package.json').version !== PINNED.version)
  throw new Error(`installed eslint-plugin-react is not ${PINNED.version}`);

// ── virtual modules ────────────────────────────────────────────────────
const virtual = new Map();
const defineVirtual = (id, exports) => {
  const filename = `/__virtual__/${id}`;
  const m = new Module(filename);
  m.filename = filename;
  m.loaded = true;
  m.exports = exports;
  Module._cache[filename] = m;
  virtual.set(id, filename);
  return filename;
};

const cases = [];
/** The rule a test file is named for: the grading key. */
let currentFile = '';
const nonJson = [];

const fixtureToken = (s) =>
  typeof s === 'string'
    ? s
        .split(FIXTURES)
        .join('<fixtures>')
        .split(UP)
        .join('<upstream>')
        .split(ROOT)
        .join('<repo>')
    : s;
const pkgOfPath = (p) =>
  [...p.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)].pop()?.[1];
function plain(v, where) {
  if (v === undefined) return undefined;
  if (typeof v === 'number' && !Number.isFinite(v)) {
    nonJson.push(`${where}: ${v}`);
    return { $number: String(v) };
  }
  if (v === null || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return fixtureToken(v);
  if (v instanceof RegExp) {
    nonJson.push(`${where}: RegExp ${v}`);
    return { $regexp: v.source, flags: v.flags };
  }
  if (typeof v === 'function') {
    nonJson.push(`${where}: function`);
    return { $function: true };
  }
  if (Array.isArray(v)) return v.map((x, i) => plain(x, `${where}[${i}]`));
  const o = {};
  for (const [k, x] of Object.entries(v)) {
    const p = plain(x, `${where}.${k}`);
    if (p !== undefined) o[fixtureToken(k)] = p;
  }
  return o;
}
const parserName = (p) => {
  if (p == null) return null;
  if (typeof p === 'string') {
    if (p.startsWith('/__virtual__/missing/'))
      return p.slice('/__virtual__/missing/'.length);
    return pkgOfPath(p) ?? `unknown:${fixtureToken(p)}`;
  }
  return 'unknown-object';
};

// ── the recorder, standing in for tests/helpers/ruleTester ──────────────
const ruleIdOf = new Map(); // rule object -> upstream rule name
const coreRuleOf = new Map(); // core rule object -> its id
function record(rule, kind, i, raw, tester) {
  const c = typeof raw === 'string' ? { code: raw } : raw;
  const where = `${rule} ${kind}#${i}`;
  const po = { ...(tester.parserOptions || {}), ...(c.parserOptions || {}) };
  // Upstream's helper: ecmaVersion 5 / sourceType 'script' unless set.
  const ecmaVersion = po.ecmaVersion ?? 5;
  const sourceType = po.sourceType ?? 'script';
  const { sourceType: _s, ecmaVersion: _e, ...parserOptions } = po;
  const errors =
    kind === 'invalid'
      ? typeof c.errors === 'number'
        ? c.errors
        : (c.errors || []).length
      : 0;
  const messages =
    kind === 'invalid' && Array.isArray(c.errors)
      ? c.errors.map((e) =>
          typeof e === 'string'
            ? { message: e }
            : {
                ...(e.messageId ? { messageId: e.messageId } : {}),
                ...(typeof e.message === 'string'
                  ? { message: fixtureToken(e.message) }
                  : {}),
              },
        )
      : undefined;
  const globals = c.globals ?? tester.globals;
  cases.push({
    rule: currentFile,
    ...(coreRuleOf.has(rule) ? { coreRule: coreRuleOf.get(rule) } : {}),
    kind,
    i,
    code: fixtureToken(c.code),
    filename: c.filename ? fixtureToken(c.filename) : null,
    ...(c.options ? { options: plain(c.options, `${where} options`) } : {}),
    ...(c.settings || tester.settings
      ? {
          settings: plain(
            { ...(tester.settings || {}), ...(c.settings || {}) },
            `${where} settings`,
          ),
        }
      : {}),
    parser: parserName(c.parser ?? tester.parser),
    sourceType,
    ecmaVersion,
    ...(Object.keys(parserOptions).length
      ? { parserOptions: plain(parserOptions, `${where} parserOptions`) }
      : {}),
    ...(globals ? { globals: plain(globals, `${where} globals`) } : {}),
    errors,
    ...(messages ? { messages } : {}),
    ...(c.output !== undefined ? { hasOutput: true } : {}),
  });
}
class CapturingRuleTester {
  constructor(config) {
    this.config = config || {};
  }
  run(name, rule, tests) {
    const id = ruleIdOf.get(rule) ?? coreRuleOf.get(rule);
    if (!id) throw new Error(`suite "${name}" runs an unknown rule`);
    (tests.valid || []).forEach((c, i) =>
      record(rule, 'valid', i, c, this.config),
    );
    (tests.invalid || []).forEach((c, i) =>
      record(rule, 'invalid', i, c, this.config),
    );
  }
}

const ruleTesterFile = defineVirtual('helpers/ruleTester', CapturingRuleTester);
const definerFile = defineVirtual('helpers/getRuleDefiner', () => ({
  defineRule() {},
}));
const coreFile = defineVirtual('helpers/getESLintCoreRule', (id) => {
  const rule = rootRequire('eslint/use-at-your-own-risk').builtinRules.get(id);
  coreRuleOf.set(rule, id);
  return rule;
});
defineVirtual('eslint/package.json', { version: EMULATED_ESLINT });
defineVirtual('typescript-eslint-parser/package.json', { version: '22.0.0' });

const blocked = (name) => () => {
  throw new Error(`blocked during capture: ${name}`);
};
const realFs = require('fs');
defineVirtual('guarded/fs', {
  ...realFs,
  ...Object.fromEntries(
    [
      'writeFileSync',
      'appendFileSync',
      'unlinkSync',
      'rmSync',
      'mkdirSync',
    ].map((n) => [n, blocked(`fs.${n}`)]),
  ),
});

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (virtual.has(request)) return virtual.get(request);
  const fromUpstream = parent?.filename?.startsWith(UP);
  if (fromUpstream && request.startsWith('.')) {
    const abs = path.resolve(path.dirname(parent.filename), request);
    if (abs === path.join(UP, 'tests/helpers/ruleTester'))
      return ruleTesterFile;
    if (abs === path.join(UP, 'tests/helpers/getRuleDefiner'))
      return definerFile;
    if (abs === path.join(UP, 'tests/helpers/getESLintCoreRule'))
      return coreFile;
    // lib/ of the checkout -> the same file in the installed npm package.
    if (abs.startsWith(path.join(UP, 'lib') + path.sep)) {
      const rel = path.relative(UP, abs);
      const file = rootRequire.resolve(`eslint-plugin-react/${rel}`);
      return file;
    }
  }
  if (fromUpstream && request === 'fs') return virtual.get('guarded/fs');
  try {
    return origResolve.call(this, request, parent, ...rest);
  } catch (e) {
    if (!fromUpstream || request.startsWith('.')) throw e;
    try {
      return rootRequire.resolve(request);
    } catch {
      // A dev dependency upstream installs and this repo does not
      // (babel-eslint, @babel/eslint-parser, typescript-eslint-parser).
      const id = `missing/${request}`;
      return (
        virtual.get(id) ??
        defineVirtual(id, { $missing: request, version: '0.0.0' })
      );
    }
  }
};
// Register each upstream rule object -> name as it loads.
const origLoad = Module._load;
Module._load = function (request, parent, ...rest) {
  const out = origLoad.call(this, request, parent, ...rest);
  const m = /(?:^|\/)lib\/rules\/([\w-]+)$/.exec(request);
  if (m && out && out.meta !== undefined) ruleIdOf.set(out, m[1]);
  return out;
};

// ── mocha, inline ──────────────────────────────────────────────────────
const mochaThis = { timeout() {}, slow() {}, retries() {}, skip() {} };
const notRun = [];
const block = (name, fn) => {
  fn?.call(mochaThis);
  return mochaThis;
};
global.describe = global.context = block;
global.it = (name, fn) => {
  try {
    return block(name, fn);
  } catch (e) {
    notRun.push(`${name}: ${e.message.split('\n')[0]}`);
    return mochaThis;
  }
};
global.describe.skip = global.context.skip = global.it.skip = () => {};
global.before = global.beforeEach = global.after = global.afterEach = () => {};

process.chdir(UP);
const dir = path.join(UP, 'tests/lib/rules');
const skipped = [];
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.js')) continue;
  currentFile = f.replace(/\.js$/, '');
  try {
    require(path.join(dir, f));
  } catch (e) {
    skipped.push(`${f}: ${e.message.split('\n')[0]}`);
  }
}
if (notRun.length)
  console.error('`it` blocks not run:\n  ' + notRun.join('\n  '));
if (skipped.length) {
  console.error('could not load:\n  ' + skipped.join('\n  '));
  process.exit(1);
}

// Cases for a parser this repo does not install cannot be graded, ever. They
// are counted (per rule) in the header and left out of `cases`, which keeps the
// committed file at the size of what can be run.
const UNAVAILABLE = [
  'babel-eslint',
  '@babel/eslint-parser',
  'typescript-eslint-parser',
];
const notCaptured = {};
const gradeable = [];
for (const c of cases.splice(0)) {
  if (UNAVAILABLE.includes(c.parser)) {
    const k = (notCaptured[c.parser] ??= { total: 0, byRule: {} });
    k.total++;
    k.byRule[c.rule] = (k.byRule[c.rule] ?? 0) + 1;
  } else gradeable.push(c);
}
const capturedTotal =
  gradeable.length +
  Object.values(notCaptured).reduce((n, k) => n + k.total, 0);
cases.push(...gradeable);

const out = path.join(
  ROOT,
  'benchmarks/corpus/competitor-parity/eslint-plugin-react.json',
);
const invalid = cases.filter((c) => c.kind === 'invalid').length;
const corpus = {
  source: {
    package: PINNED.package,
    version: PINNED.version,
    license: 'MIT',
    upstream: 'https://github.com/jsx-eslint/eslint-plugin-react',
    tag: PINNED.tag,
    commit: PINNED.commit,
    extractedFrom:
      'tests/lib/rules/*.js via RuleTester capture (benchmarks/scripts/extract-react-cases.cjs)',
    fixtures: 'tests/fixtures at the pinned commit, referenced as <fixtures>',
    versionGatesEvaluatedAs: `eslint@${EMULATED_ESLINT}`,
  },
  notice:
    'Test cases below are derived from eslint-plugin-react. Retained for interoperability/parity benchmarking under its MIT License, whose copyright and permission notice follow in `licenseText` and apply to this file. Do not relicense.',
  licenseText: fs.readFileSync(path.join(UP, 'LICENSE'), 'utf8'),
  counts: {
    total: cases.length,
    invalid,
    valid: cases.length - invalid,
    rules: new Set(cases.map((c) => c.rule)).size,
    defaultParser: cases.filter((c) => c.parser === null).length,
    capturedBeforeParserFilter: capturedTotal,
  },
  parsersNotInstalled: {
    note: 'Cases upstream fans out to these parsers; not in `cases` because the parser is not installed here. Counted, never graded.',
    ...notCaptured,
  },
  ...(nonJson.length ? { nonJson } : {}),
  ...(notRun.length ? { itBlocksNotRun: notRun } : {}),
  cases,
};
const { cases: all, ...header } = corpus;
const headerText = JSON.stringify(header, null, 1).replace(/\n}$/, '');
fs.writeFileSync(
  out,
  `${headerText},\n "cases": [\n${all.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n ]\n}\n`,
);
console.log(
  `wrote ${path.relative(ROOT, out)} — ${cases.length} cases (${invalid} invalid) across ${corpus.counts.rules} suites; ${corpus.counts.defaultParser} on the default parser`,
);
const byParser = {};
for (const c of cases)
  byParser[c.parser ?? 'default'] = (byParser[c.parser ?? 'default'] ?? 0) + 1;
console.log('by parser:', JSON.stringify(byParser));
if (nonJson.length) console.log(`non-JSON values: ${nonJson.length}`);
