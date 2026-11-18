/**
 * extract-import-cases.cjs — capture eslint-plugin-import's OWN RuleTester
 * suite as data, so import-next can be graded by the incumbent's tests
 * (PRINCIPLES.md: "drop-in compatibility graded by the incumbent's own tests").
 *
 *   node benchmarks/scripts/extract-import-cases.cjs <path-to-eslint-plugin-import checkout>
 *
 * The checkout must be at the pinned tag (PINNED below); the script refuses any
 * other commit, so the corpus is reproducible byte for byte.
 *
 * Same method as extract-competitor-cases.cjs (the eslint-plugin-security
 * corpus): every test file under tests/src/rules is executed with RuleTester
 * replaced by a recorder, so each case is captured exactly as upstream builds it
 * — `test()` defaults, per-parser fan-out, version gates — rather than parsed
 * out of the source with a regex. What differs from the security capture:
 *
 *   - Upstream's tests are ESM run through Babel; here esbuild turns each file
 *     into CommonJS on load. No upstream install is needed: bare imports
 *     resolve from this repo's node_modules.
 *   - Version gates are evaluated as ESLint 9 (EMULATED_ESLINT), the newest
 *     major upstream supports — its suite has no ESLint 10 branch to capture.
 *   - Parsers are recorded by package name, settings/code/filenames with the
 *     absolute fixture directory replaced by `<fixtures>`, so the corpus does
 *     not encode the machine it was captured on.
 *   - The fixture files themselves are NOT copied (413 files, several of them
 *     node_modules trees the root .gitignore would drop). The grader reads them
 *     from a checkout of the same pinned commit.
 *   - Mocha's describe/it run inline; `before*` hooks are recorded but not run,
 *     and every case captured under one is flagged `setupHook: true`.
 */
const Module = require('module');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PINNED = {
  package: 'eslint-plugin-import',
  version: '2.32.0',
  tag: 'v2.32.0',
  commit: '01c9eb04331d2efa8d63f2d7f4bfec3bc44c94f3',
};
const EMULATED_ESLINT = '9.39.1';

const ROOT = path.resolve(__dirname, '../..');
const UP = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(path.join(UP, 'tests/src/rules'))) {
  console.error(
    'usage: extract-import-cases.cjs <eslint-plugin-import checkout>',
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
const FIXTURES = path.join(UP, 'tests/files');
const rootRequire = Module.createRequire(path.join(ROOT, 'package.json'));
const esbuild = rootRequire('esbuild');

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

/** Parsers by package name; path → name and object → name for the record. */
const PARSER_NAMES = ['espree', '@typescript-eslint/parser', 'babel-eslint'];
const parserByPath = new Map();
const parserByObject = new Map();
for (const name of PARSER_NAMES) {
  let file;
  try {
    file = rootRequire.resolve(name);
    parserByObject.set(rootRequire(name), name);
  } catch {
    // Not installed here (babel-eslint): a sentinel stands in. Cases that ask
    // for it are recorded with the name and graded as not reproducible.
    file = defineVirtual(`parser/${name}`, { parseForESLint: null });
  }
  parserByPath.set(file, name);
}

// Rules: the recorder never runs one, but some suites read `rule.meta.messages`
// to build expected messages. The npm build of the same version is the source.
const ruleIdOf = new Map();
const upstreamRule = (request) => {
  const rule = rootRequire(`eslint-plugin-import/lib/${request}`);
  ruleIdOf.set(rule, request.slice('rules/'.length));
  return rule;
};
if (rootRequire('eslint-plugin-import/package.json').version !== PINNED.version)
  throw new Error(`installed eslint-plugin-import is not ${PINNED.version}`);

const cases = [];
/** Open describe/it frames: { name, hooked }. */
const frames = [];
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
/** A parser named by path → its package name, wherever it was installed. */
const pkgOfPath = (p) =>
  [...p.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g)].pop()?.[1];
/** Suite titles embed parser paths (`max-dependencies (<path>)`). */
const titleToken = (t) =>
  t.replace(/\/\S*node_modules\/[^\s)]+/g, (m) => pkgOfPath(m) ?? m);
/** Deep-copy into plain JSON, tokenising the fixture dir; flag what JSON loses. */
function plain(v, where) {
  if (v === undefined) return undefined;
  if (typeof v === 'number' && !Number.isFinite(v)) {
    // JSON writes Infinity as null (no-cycle's `maxDepth: Infinity`).
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
    // `import/parsers` is keyed by the parser's resolved path.
    const key = k.includes('node_modules/')
      ? (pkgOfPath(k) ?? k)
      : fixtureToken(k);
    if (p !== undefined) o[key] = p;
  }
  return o;
}
const parserName = (p) => {
  if (p == null) return null;
  if (typeof p === 'string') {
    if (parserByPath.has(p)) return parserByPath.get(p);
    if (p.startsWith('/__virtual__/missing/'))
      return p.slice('/__virtual__/missing/'.length);
    return pkgOfPath(p) ?? `unknown:${fixtureToken(p)}`;
  }
  if (p.$missing) return p.$missing;
  return parserByObject.get(p) ?? 'unknown-object';
};

/**
 * One captured case. `tester` is the RuleTester constructor config (legacy or
 * flat); case keys override it, as RuleTester merges them.
 */
function record(rule, suite, kind, i, raw, tester, flat) {
  const c = typeof raw === 'string' ? { code: raw } : raw;
  const where = `${titleToken(suite)} ${kind}#${i}`;
  const lo = {
    ...(tester.languageOptions || {}),
    ...(c.languageOptions || {}),
  };
  const po = {
    ...(tester.parserOptions || {}),
    ...(lo.parserOptions || {}),
    ...(c.parserOptions || {}),
  };
  // Upstream's FlatCompatRuleTester defaults a bare tester to sourceType
  // 'script'; ESLint's flat RuleTester (the one FlatRuleTester cases use)
  // defaults to 'module'.
  const sourceType =
    po.sourceType ?? lo.sourceType ?? (flat ? 'module' : 'script');
  const ecmaVersion = po.ecmaVersion ?? lo.ecmaVersion ?? 'latest';
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
            ? e
            : (e.message ?? (e.messageId ? `messageId:${e.messageId}` : null)),
        )
      : undefined;
  cases.push({
    rule,
    ...(suite !== rule ? { suite: titleToken(suite) } : {}),
    kind,
    i,
    ...(frames.length
      ? { describe: titleToken(frames.map((f) => f.name).join(' › ')) }
      : {}),
    _frames: [...frames],
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
    parser: parserName(c.parser ?? lo.parser ?? tester.parser),
    sourceType,
    ecmaVersion,
    ...(Object.keys(parserOptions).length
      ? { parserOptions: plain(parserOptions, `${where} parserOptions`) }
      : {}),
    errors,
    ...(messages ? { messages } : {}),
  });
}

const makeTester = (flat) =>
  class CapturingRuleTester {
    constructor(config) {
      this.config = config || {};
    }
    run(name, rule, tests) {
      // The suite title is free text; the rule object says which rule it is.
      const id = ruleIdOf.get(rule);
      if (!id)
        throw new Error(`suite "${name}" runs a rule not loaded from rules/`);
      (tests.valid || []).forEach((c, i) =>
        record(id, name, 'valid', i, c, this.config, flat),
      );
      (tests.invalid || []).forEach((c, i) =>
        record(id, name, 'invalid', i, c, this.config, flat),
      );
    }
  };
// Two testers can run the same suite name (a flow tester and the default one
// in order.js); `i` restarts per run() and the record's position keeps them
// apart. The pair (rule, kind, i, describe) plus array order is the identity.

const realEslint = rootRequire('eslint');
defineVirtual('eslint', { ...realEslint, RuleTester: makeTester(true) });
defineVirtual('eslint/package.json', { version: EMULATED_ESLINT });
defineVirtual('eslint/use-at-your-own-risk', {
  FlatRuleTester: makeTester(true),
});
defineVirtual('rule-tester', {
  RuleTester: makeTester(false),
  usingFlatConfig: true,
  // Upstream's own body: under flat config the case is returned unchanged.
  withoutAutofixOutput: (t) => ({ ...t }),
});
// Old TS parser: absent upstream under ESLint 9 too; its gates take the
// "not TS_OLD" branch whatever version is reported.
defineVirtual('typescript-eslint-parser/package.json', { version: '22.0.0' });

// Upstream test bodies may not touch the disk or spawn anything: a few `it`
// blocks build the plugin and `npm install` it, and no-unused-modules writes
// fixture files. Those calls throw here; the `it` is reported as not run.
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
      'rmdirSync',
      'renameSync',
      'mkdirSync',
      'cpSync',
      'copyFileSync',
      'symlinkSync',
    ].map((n) => [n, blocked(`fs.${n}`)]),
  ),
});
defineVirtual(
  'guarded/child_process',
  Object.fromEntries(
    Object.keys(require('child_process')).map((n) => [
      n,
      blocked(`child_process.${n}`),
    ]),
  ),
);

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (virtual.has(request)) return virtual.get(request);
  if (request.startsWith('rules/')) {
    return (
      virtual.get(request) ?? defineVirtual(request, upstreamRule(request))
    );
  }
  for (const name of PARSER_NAMES) {
    if (request === name && virtual.has(`parser/${name}`))
      return virtual.get(`parser/${name}`);
  }
  const fromUpstream = parent?.filename?.startsWith(UP);
  // One suite loads its rule by relative path into upstream's src/.
  const srcRule =
    fromUpstream && request.match(/^(?:\.\.\/)+src\/(rules\/[\w-]+)$/);
  if (srcRule)
    return (
      virtual.get(srcRule[1]) ??
      defineVirtual(srcRule[1], upstreamRule(srcRule[1]))
    );
  if (fromUpstream && request === '../rule-tester')
    return virtual.get('rule-tester');
  if (
    fromUpstream &&
    ['fs', 'child_process'].includes(request.replace(/^node:/, ''))
  )
    return virtual.get(`guarded/${request.replace(/^node:/, '')}`);
  try {
    return origResolve.call(this, request, parent, ...rest);
  } catch (e) {
    if (!fromUpstream || request.startsWith('.')) throw e;
    try {
      return rootRequire.resolve(request);
    } catch {
      // A dev dependency upstream installs and this repo does not (a parser
      // such as @angular-eslint/template-parser, babel-preset-flow). A named
      // stub lets the file load; cases that need it carry the name.
      const id = `missing/${request}`;
      return virtual.get(id) ?? defineVirtual(id, { $missing: request });
    }
  }
};

// ESM → CJS for upstream files only.
const origJs = Module._extensions['.js'];
Module._extensions['.js'] = function (m, filename) {
  if (!filename.startsWith(UP) || filename.includes('/node_modules/'))
    return origJs(m, filename);
  const { code } = esbuild.transformSync(fs.readFileSync(filename, 'utf8'), {
    loader: 'js',
    format: 'cjs',
    target: 'node18',
    sourcefile: filename,
  });
  m._compile(code, filename);
};

// ── mocha, inline ──────────────────────────────────────────────────────
// Hooks are not run (no-unused-modules' write fixture files). A hook marks its
// frame, wherever in the body it is declared — mocha runs hooks before the
// frame's tests — and every case recorded under a marked frame is flagged.
const mochaThis = { timeout() {}, slow() {}, retries() {}, skip() {} };
const notRun = [];
const block = (name, fn) => {
  frames.push({ name, hooked: false });
  try {
    fn?.call(mochaThis);
  } finally {
    frames.pop();
  }
  return mochaThis;
};
global.describe = global.context = block;
// An `it` that throws (a blocked side effect, a chai assertion on something the
// recorder never ran) is reported and skipped; the file's other cases stay.
global.it = (name, fn) => {
  try {
    return block(name, fn);
  } catch (e) {
    notRun.push(
      `${[...frames.map((f) => f.name), name].join(' › ')}: ${e.message.split('\n')[0]}`,
    );
    return mochaThis;
  }
};
global.describe.skip = global.context.skip = global.it.skip = () => {};
global.before =
  global.beforeEach =
  global.after =
  global.afterEach =
    () => {
      if (frames.length) frames[frames.length - 1].hooked = true;
      else topLevelHook = true;
    };
let topLevelHook = false;

// upstream utils.js computes paths from process.cwd()
process.chdir(UP);

const dir = path.join(UP, 'tests/src/rules');
const skipped = [];
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.js')) continue;
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

for (const c of cases) {
  if (topLevelHook || c._frames.some((f) => f.hooked)) c.setupHook = true;
  delete c._frames;
}

const out = path.join(
  ROOT,
  'benchmarks/corpus/competitor-parity/eslint-plugin-import.json',
);
const invalid = cases.filter((c) => c.kind === 'invalid').length;
const corpus = {
  source: {
    package: PINNED.package,
    version: PINNED.version,
    license: 'MIT',
    upstream: 'https://github.com/import-js/eslint-plugin-import',
    tag: PINNED.tag,
    commit: PINNED.commit,
    extractedFrom:
      'tests/src/rules/*.js via RuleTester capture (benchmarks/scripts/extract-import-cases.cjs)',
    fixtures: 'tests/files at the pinned commit, referenced as <fixtures>',
    versionGatesEvaluatedAs: `eslint@${EMULATED_ESLINT}`,
  },
  notice:
    'Test cases below are derived from eslint-plugin-import. Retained for interoperability/parity benchmarking under its MIT License, whose copyright and permission notice follow in `licenseText` and apply to this file. Do not relicense.',
  // Read from the pinned checkout, so the notice is the one the cases came with.
  licenseText: fs.readFileSync(path.join(UP, 'LICENSE'), 'utf8'),
  counts: {
    total: cases.length,
    invalid,
    valid: cases.length - invalid,
    rules: new Set(cases.map((c) => c.rule)).size,
  },
  ...(nonJson.length ? { nonJson } : {}),
  ...(notRun.length ? { itBlocksNotRun: notRun } : {}),
  cases,
};
// Header pretty-printed, one case per line: a re-capture diffs case by case.
const { cases: all, ...header } = corpus;
const headerText = JSON.stringify(header, null, 1).replace(/\n}$/, '');
fs.writeFileSync(
  out,
  `${headerText},\n "cases": [\n${all.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n ]\n}\n`,
);
console.log(
  `wrote ${path.relative(ROOT, out)} — ${cases.length} cases (${invalid} invalid) across ${corpus.counts.rules} suites`,
);
if (nonJson.length) console.log(`non-JSON values: ${nonJson.length}`);
