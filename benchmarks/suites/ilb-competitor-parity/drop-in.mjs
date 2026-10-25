/**
 * drop-in.mjs — the ship gate for oxlint-plugin-security
 * (docs/intents/oxlint-plugin-security-drop-in, R7/R8).
 *
 * Runs eslint-plugin-security's own RuleTester corpus against `security/<class>`
 * of a SUBJECT, one class at a time, under ESLint and then under oxlint, and
 * exits non-zero on any of:
 *
 *   - an ID that does not resolve (on either engine);
 *   - a live invalid case not reported ("live" = not declined in wont-fix.json);
 *   - a finding on a valid case that divergences.json does not declare;
 *   - a divergences.json entry that no longer fires (stale declaration);
 *   - per-case diagnostics that differ between ESLint and oxlint, compared as the
 *     multiset of (ruleId, line, column, endLine, endColumn), 1-based. Message
 *     text, severity and fixes are deliberately NOT compared: same rule object,
 *     different formatting, and fix support is a separate contract.
 *
 * The subject is the façade built from THIS repo (it guards what is about to
 * ship). `--subject eslint-plugin-security` is the control run (R8): the
 * incumbent through the same harness must score 100% and 0, or the harness —
 * not the façade — is wrong.
 *
 *   node benchmarks/suites/ilb-competitor-parity/drop-in.mjs
 *   node benchmarks/suites/ilb-competitor-parity/drop-in.mjs --subject eslint-plugin-security
 *   node benchmarks/suites/ilb-competitor-parity/drop-in.mjs --write   # record drop-in.result.json
 */
import { ESLint } from 'eslint';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const args = process.argv.slice(2);
const subjectName = args.includes('--subject')
  ? args[args.indexOf('--subject') + 1]
  : 'oxlint-plugin-security';
const isControl = subjectName === 'eslint-plugin-security';
const subjectPath = isControl
  ? require.resolve('eslint-plugin-security')
  : path.join(ROOT, 'packages', 'oxlint-plugin-security', 'index.js');
const subject = require(subjectPath);

const corpus = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      'benchmarks/corpus/competitor-parity/eslint-plugin-security.json',
    ),
    'utf8',
  ),
);
const wontFix = JSON.parse(
  fs.readFileSync(path.join(HERE, 'wont-fix.json'), 'utf8'),
).classes;
const divergences = isControl
  ? {}
  : JSON.parse(fs.readFileSync(path.join(HERE, 'divergences.json'), 'utf8'))
      .classes;

/** `detect-bidi-characters in comment-line` → `detect-bidi-characters`. */
const classOf = (suite) => suite.replace(/ \(.*\)$| in comment(?:-line)?$/, '');
const byClass = new Map();
for (const c of corpus.cases) {
  const cls = classOf(c.rule);
  if (!byClass.has(cls)) byClass.set(cls, []);
  byClass.get(cls).push(c);
}

const failures = [];
const notes = [];
const fail = (msg) => failures.push(msg);

// R3 — the façade adds no logic. An ID with no pinned options IS the mapped
// rule object; an ID with pinned options differs only in meta.defaultOptions.
if (!isControl) {
  const mapping = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'packages/oxlint-plugin-security/mapping.json'),
      'utf8',
    ),
  );
  for (const [id, entry] of Object.entries(mapping.rules)) {
    if (entry.retired) continue;
    const target = require(`eslint-plugin-${entry.plugin}`).rules[entry.rule];
    const got = subject.rules[id];
    if (!entry.defaultOptions && got !== target)
      fail(`${id}: not the mapped rule object (R3)`);
    if (entry.defaultOptions) {
      const same =
        got?.create === target?.create &&
        got?.createOnce === target?.createOnce;
      const pinned =
        JSON.stringify(got?.meta?.defaultOptions) ===
        JSON.stringify(entry.defaultOptions);
      if (!same || !pinned)
        fail(`${id}: pinned options must change meta.defaultOptions only (R3)`);
    }
  }
}

// ── ESLint ──────────────────────────────────────────────────────────────
const ruleIdOk = (cls) => Boolean(subject.rules?.[cls]);
async function eslintFindings(cls, c) {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*'],
        languageOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ...(c.languageOptions ?? {}),
        },
        plugins: { security: subject },
        rules: { [`security/${cls}`]: ['error', ...(c.options ?? [])] },
      },
    ],
  });
  const [res] = await eslint.lintText(c.code ?? '', {
    filePath: path.join(ROOT, c.filename ?? 'case.js'),
  });
  for (const m of res.messages)
    if (!m.ruleId) fail(`${cls} ${c.kind}#${c.i}: ESLint error — ${m.message}`);
  return res.messages
    .filter((m) => m.ruleId === `security/${cls}`)
    .map((m) => ({
      line: m.line,
      column: m.column,
      endLine: m.endLine,
      endColumn: m.endColumn,
    }));
}

// ── oxlint ──────────────────────────────────────────────────────────────
const OXLINT = path.join(ROOT, 'node_modules', '.bin', 'oxlint');

/**
 * line/column (1-based) of an oxlint span offset. oxlint counts UTF-8 BYTES,
 * ESLint counts UTF-16 code units — they part ways on the first multi-byte
 * character, which is every bidi and invisible-character case.
 */
function position(text, offset) {
  // Line terminators as ECMAScript defines them (and ESLint counts them): the
  // incumbent's 4.1.0 cases put U+2028/U+2029 inside comments on purpose.
  const before = Buffer.from(text, 'utf8')
    .subarray(0, offset)
    .toString('utf8')
    .split(/\r\n|[\n\r\u2028\u2029]/);
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function oxlintFindings(cls, cases) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `drop-in-${cls}-`));
  const fileOf = new Map();
  // One directory per case by POSITION: a class can merge two upstream suites
  // (`detect-bidi-characters` + `… in comment-line`) whose `i` both start at 0.
  for (const [n, c] of cases.entries()) {
    const dir = path.join(work, `case-${n}`);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, path.basename(c.filename ?? 'case.js'));
    fs.writeFileSync(file, c.code ?? '');
    fileOf.set(file, c);
  }
  // The config sits beside the cases so per-case `overrides` match by relative
  // path; the plugin path is absolute, so resolution does not depend on it.
  const config = path.join(work, '.oxlintrc.json');
  const overrides = [...cases.entries()]
    .filter(([, c]) => c.languageOptions?.globals)
    .map(([n, c]) => ({
      files: [`case-${n}/**`],
      globals: c.languageOptions.globals,
    }));
  fs.writeFileSync(
    config,
    JSON.stringify({
      jsPlugins: [subjectPath],
      rules: { [`security/${cls}`]: 'error' },
      overrides,
    }),
  );
  const run = spawnSync(OXLINT, ['-c', config, '--format', 'json', work], {
    encoding: 'utf8',
  });
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    fail(
      `${cls}: oxlint did not load the rule — ${(run.stdout + run.stderr).trim().split('\n')[0]}`,
    );
    return null;
  }
  const out = new Map(cases.map((c) => [c, []]));
  for (const d of report.diagnostics) {
    if (d.code !== `security(${cls})`) continue;
    const c = fileOf.get(d.filename);
    const span = d.labels?.[0]?.span;
    if (!c || !span) continue;
    const text = c.code ?? '';
    const start = position(text, span.offset);
    const end = position(text, span.offset + span.length);
    out.get(c).push({
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
    });
  }
  fs.rmSync(work, { recursive: true, force: true });
  return out;
}

const key = (f) => `${f.line}:${f.column}-${f.endLine}:${f.endColumn}`;
const sameFindings = (a, b) =>
  JSON.stringify(a.map(key).sort()) === JSON.stringify(b.map(key).sort());

// ── per class ───────────────────────────────────────────────────────────
const table = [];
for (const [cls, cases] of byClass) {
  const declined = isControl ? undefined : wontFix[cls];
  const retired =
    Boolean(declined?.retired) ||
    (isControl ? false : Boolean(subject.rules?.[cls]?.meta?.deprecated));
  if (!ruleIdOk(cls)) {
    fail(`${cls}: security/${cls} does not resolve in ${subjectName}`);
    continue;
  }
  const ox = oxlintFindings(cls, cases);
  const declared = new Set(divergences[cls]?.valid ?? []);
  let detected = 0;
  let missed = 0;
  let firedOnValid = 0;
  const stillDiverges = new Set();
  const invalid = cases.filter((c) => c.kind === 'invalid');
  for (const c of cases) {
    const es = await eslintFindings(cls, c);
    if (ox && !sameFindings(es, ox.get(c))) {
      fail(
        `${cls} ${c.kind}#${c.i}: ESLint [${es.map(key)}] ≠ oxlint [${ox.get(c).map(key)}]`,
      );
    }
    if (c.kind === 'invalid') {
      if (es.length) detected++;
      else missed++;
    } else if (es.length) {
      firedOnValid++;
      if (declared.has(c.i)) stillDiverges.add(c.i);
      else
        fail(
          `${cls} valid#${c.i}: reports a case the incumbent calls safe — declare it in divergences.json or fix the rule`,
        );
    }
  }
  for (const i of declared) {
    if (!stillDiverges.has(i))
      fail(
        `${cls} valid#${i}: declared in divergences.json but no longer fires — remove the entry`,
      );
  }
  // Retired IDs and whole-class won't-fix decline every invalid case; a partial
  // entry declines up to its `cases` count.
  const allowed =
    retired || (declined && !declined.partial)
      ? invalid.length
      : declined?.partial
        ? declined.cases
        : 0;
  if (missed > allowed) {
    fail(
      `${cls}: ${missed - allowed} live invalid case(s) not reported (${detected}/${invalid.length} detected)`,
    );
  }
  table.push({
    cls,
    detected,
    invalid: invalid.length,
    declined: Math.min(missed, allowed),
    firedOnValid,
    declared: declared.size,
    retired,
  });
}

// ── report ──────────────────────────────────────────────────────────────
const live = table.reduce((s, r) => s + r.invalid - r.declined, 0);
const caught = table.reduce(
  (s, r) => s + Math.min(r.detected, r.invalid - r.declined),
  0,
);
const validTotal = corpus.cases.filter((c) => c.kind === 'valid').length;
const undeclaredFires = table.reduce(
  (s, r) => s + (r.firedOnValid - r.declared),
  0,
);
console.log(
  `drop-in gate — ${subjectName} vs ${corpus.source.package}@${corpus.source.version} (${corpus.cases.length} cases)\n`,
);
for (const r of table) {
  const tag = r.retired
    ? 'retired'
    : r.declined
      ? `${r.declined} declined`
      : '';
  console.log(
    `  ${r.cls.padEnd(40)} invalid ${r.detected}/${r.invalid}${tag ? ` (${tag})` : ''}  valid fired ${r.firedOnValid}/${r.declared} declared`,
  );
}
console.log(`\n  live invalid detected: ${caught}/${live}`);
console.log(
  `  findings on valid cases: ${table.reduce((s, r) => s + r.firedOnValid, 0)}/${validTotal} (${undeclaredFires} undeclared)`,
);
for (const n of notes) console.log(`  note: ${n}`);

if (args.includes('--write') && !isControl) {
  fs.writeFileSync(
    path.join(HERE, 'drop-in.result.json'),
    JSON.stringify(
      {
        $comment:
          'Written by drop-in.mjs --write. The README parity line is rendered from this file.',
        measuredOn: new Date().toISOString().slice(0, 10),
        incumbent: `${corpus.source.package}@${corpus.source.version}`,
        cases: corpus.cases.length,
        liveInvalid: { detected: caught, total: live },
        validFindings: {
          total: table.reduce((s, r) => s + r.firedOnValid, 0),
          declared: table.reduce((s, r) => s + r.declared, 0),
          of: validTotal,
        },
        enginesAgree: !failures.some((f) => f.includes('≠ oxlint')),
        gate: failures.length === 0 ? 'green' : 'red',
      },
      null,
      2,
    ) + '\n',
  );
}

if (failures.length) {
  console.error(`\n❌ gate red — ${failures.length} problem(s):`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log('\n✅ gate green');
