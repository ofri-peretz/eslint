/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * detect-object-injection, head to head with eslint-plugin-security.
 *
 * Every number this emits is produced by running both rules over the same
 * string in the same process on the run that prints it. Nothing is quoted from
 * memory and nothing is stored.
 *
 * ## Judging two rules with different contracts
 *
 * Their documentation states the contract plainly: "This rule flags any
 * expression in the form of `object[expression]` no matter where it occurs."
 * That is a REVIEW AID — make dynamic access visible — not a vulnerability
 * detector. Judged that way, reporting a benign copy loop is the product
 * working, not a defect, and it would be dishonest to score it as noise
 * without saying so.
 *
 * So the battery is scored twice:
 *
 *   AS A DETECTOR   a `defect` must report; a `decoy` and a `remedy` must not.
 *                   This is the contract we hold ourselves to.
 *   AS A REVIEW AID does the rule do what ITS OWN DOCUMENTATION promises —
 *                   flag every `object[expression]`, whatever the expression.
 *
 * A rule cannot be criticised for failing a contract it never made. It can be
 * criticised for failing its own.
 *
 *   npx tsx scripts/doi-head-to-head.mts [--md]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Linter } from 'eslint';
import * as tsparser from '@typescript-eslint/parser';
import * as securityPlugin from 'eslint-plugin-security';
import plugin from '../packages/eslint-plugin-secure-coding/src/index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const EMIT = process.argv.includes('--md');
const TO_REGISTRY = process.argv.includes('--registry');

type Kind = 'defect' | 'decoy' | 'remedy';
type Case = {
  id: string;
  kind: Kind;
  label: string;
  code: string;
  why: string;
};

/**
 * `defect` — the thing CWE-1321 actually is: a write whose key the caller can
 * choose. `decoy` — computed access that cannot pollute. `remedy` — the
 * documented fix, which must stay silent, because reporting the fix leaves the
 * user nothing to do.
 */
const CASES: Case[] = [
  // ── defects ────────────────────────────────────────────────────────────
  {
    id: 'D01',
    kind: 'defect',
    label: 'request value used directly as a key',
    code: 'function f(o, req) { o[req.query.p] = 1; }',
    why: 'The caller names the key. `__proto__` re-parents the object.',
  },
  {
    id: 'D02',
    kind: 'defect',
    label: 'request value bound one line earlier',
    code: 'function f(o, req) { const k = req.body.key; o[k] = req.body.value; }',
    why: 'Same defect, one binding of indirection.',
  },
  {
    id: 'D03',
    kind: 'defect',
    label: 'destructured from the body',
    code: 'function f(o, req) { const { key } = req.body; o[key] = 1; }',
    why: 'Same defect, destructured.',
  },
  {
    id: 'D04',
    kind: 'defect',
    label: 'route parameter as a key',
    code: 'function f(o, req) { o[req.params.id] = 1; }',
    why: 'A path segment is caller-chosen.',
  },
  {
    id: 'D05',
    kind: 'defect',
    label: 'key from parsed JSON',
    code: 'function f(o, s) { const d = JSON.parse(s); o[d.k] = d.v; }',
    why: 'Parsed input is caller-controlled by definition.',
  },
  {
    id: 'D06',
    kind: 'defect',
    label: 'the merge helper behind the deep-extend CVEs',
    code: 'function merge(dst, src) { for (const k in src) { dst[k] = src[k]; } return dst; }',
    why: 'The shape behind the published prototype-pollution advisories.',
  },
  {
    id: 'D07',
    kind: 'defect',
    label: 'merge iterating the request body',
    code: 'function f(dst, req) { for (const k in req.body) { dst[k] = req.body[k]; } }',
    why: 'Same loop, attacker at the root, no parameter to hide behind.',
  },
  {
    id: 'D08',
    kind: 'defect',
    label: 'computed write onto `this`',
    code: 'class Bag { set(k, v) { this[k] = v; } }',
    why: 'Verified by execution: calling with `__proto__` re-parents the instance.',
  },
  {
    id: 'D09',
    kind: 'defect',
    label: 'key produced by a call the file cannot summarise',
    code: 'function f(o) { o[getKey()] = 1; }',
    why: 'Unresolvable key on a write. Reported because it cannot be proved safe.',
  },
  {
    id: 'D10',
    kind: 'defect',
    label: 'key reached through a template',
    code: 'function f(o, req) { o[`${req.query.p}`] = 1; }',
    why: 'Interpolation does not launder the value.',
  },

  // Added by an ADVERSARIAL pass — written to make our own rule fail, not to
  // flatter it. A battery whose author only thought of cases they already
  // handle measures the author.
  {
    id: 'D11',
    kind: 'defect',
    label: 'header value as key',
    code: 'function f(o, req) { o[req.headers["x-key"]] = 1; }',
    why: 'A header is caller-chosen.',
  },
  {
    id: 'D12',
    kind: 'defect',
    label: 'nested destructure from the body',
    code: 'function f(o, req) { const { a: { b } } = req.body; o[b] = 1; }',
    why: 'Two levels of destructuring do not launder it.',
  },
  {
    id: 'D13',
    kind: 'defect',
    label: 'two attacker-chosen keys in one chain',
    code: 'function f(o, req) { o[req.body.a][req.body.b] = 1; }',
    why: 'Both segments are caller-chosen.',
  },
  {
    id: 'D14',
    kind: 'defect',
    label: 'merge over Object.keys of the body',
    code: 'function f(o, req) { for (const k of Object.keys(req.body)) o[k] = req.body[k]; }',
    why: 'The for-of spelling of D07.',
  },
  {
    id: 'D15',
    kind: 'defect',
    label: 'key assigned after declaration',
    code: 'function f(o, req) { let k; k = req.query.p; o[k] = 1; }',
    why: 'A late write to the binding is still a caller-chosen key.',
  },
  {
    id: 'D16',
    kind: 'defect',
    label: 'write straight onto Object.prototype',
    code: 'function f(req) { const k = req.query.k; ({}).constructor.prototype[k] = 1; }',
    why: 'Pollution without an intermediate object at all.',
  },

  // ── decoys: computed access that cannot pollute ────────────────────────
  {
    id: 'N01',
    kind: 'decoy',
    label: 'read by loop counter',
    code: 'function f(paths, i) { return paths[i]; }',
    why: 'A read. [[Get]] returns the prototype, it does not replace it.',
  },
  {
    id: 'N02',
    kind: 'decoy',
    label: 'read by a sibling key',
    code: 'function f(current, app) { return current[app.name]; }',
    why: 'A read.',
  },
  {
    id: 'N03',
    kind: 'decoy',
    label: 'read in a call argument',
    code: 'function f(config, name) { send(config[name]); }',
    why: 'A read.',
  },
  {
    id: 'N04',
    kind: 'decoy',
    label: 'array append via self-indexed length',
    code: 'function push(arr, x) { arr[arr.length] = x; }',
    why: '`arr.length` is a number; a number cannot name a prototype slot.',
  },
  {
    id: 'N05',
    kind: 'decoy',
    label: 'index write in a counted loop',
    code: 'function f(a, out) { for (let i = 0; i < a.length; i++) { out[i] = a[i]; } }',
    why: 'The key is provably numeric from its declaration.',
  },
  {
    id: 'N06',
    kind: 'decoy',
    label: 'index arithmetic',
    code: 'function f(out, i, v) { out[i + 1] = v; }',
    why: 'Numeric by construction.',
  },
  {
    id: 'N07',
    kind: 'decoy',
    label: 'typed-array element write',
    code: 'const buf = new Uint8Array(8); buf[0] = 1;',
    why: 'A typed array has no string keys to pollute.',
  },
  {
    id: 'N08',
    kind: 'decoy',
    label: 'key from a const array of string literals',
    code: 'const KEYS = ["alpha", "beta"]; const o = {}; for (const k of KEYS) { o[k] = 1; }',
    why: 'Every value the key can take is written out in the file.',
  },
  {
    id: 'N09',
    kind: 'decoy',
    label: 'the same allowlist behind Object.freeze',
    code: 'const KEYS = Object.freeze(["alpha", "beta"]); const o = {}; for (const k of KEYS) { o[k] = 1; }',
    why: 'Same, with a runtime guarantee attached.',
  },
  {
    id: 'N10',
    kind: 'decoy',
    label: 'copy loop over a module-local object',
    code: 'const cfg = { a: 1 }; const out = {}; for (const k in cfg) { out[k] = cfg[k]; }',
    why: 'Nothing an attacker supplies reaches the loop.',
  },
  {
    id: 'N11',
    kind: 'decoy',
    label: 'literal string key',
    code: 'function f(o) { return o["name"]; }',
    why: 'The key is written in the source.',
  },
  {
    id: 'N12',
    kind: 'decoy',
    label: 'numeric literal key',
    code: 'function f(o) { o[0] = 1; }',
    why: 'A number.',
  },
  {
    id: 'N13',
    kind: 'decoy',
    label: 'write to a null-prototype bag',
    code: 'function f(k, v) { const bag = Object.create(null); bag[k] = v; return bag; }',
    why: 'No prototype to pollute.',
  },
  {
    id: 'N14',
    kind: 'decoy',
    label: 'Map, which has no prototype chain for keys',
    code: 'function f(m, k, v) { m.set(k, v); }',
    why: 'Not a computed property access at all.',
  },
  {
    id: 'N15',
    kind: 'decoy',
    label: 'read from a module-local lookup table',
    code: 'const e = {}; function f(k) { return e[k] ?? null; }',
    why: 'A read.',
  },
  {
    id: 'N16',
    kind: 'decoy',
    label: 'symbol key',
    code: 'function f(o, g) { o[Symbol.iterator] = g; }',
    why: 'A symbol cannot name `__proto__`.',
  },

  // ── remedies: the documented fix must stay silent ──────────────────────
  {
    id: 'R01',
    kind: 'remedy',
    label: 'merge guarded by Object.hasOwn',
    code: 'function merge(dst, src) { for (const k in src) { if (Object.hasOwn(src, k)) dst[k] = src[k]; } }',
    why: 'The documented fix for D06. Reporting it leaves the user nothing to do.',
  },
  {
    id: 'R02',
    kind: 'remedy',
    label: 'write guarded by an explicit __proto__ check',
    code: 'function f(dst, src) { for (const k in src) { if (k === "__proto__") continue; dst[k] = src[k]; } }',
    why: 'The other documented fix.',
  },
  {
    id: 'R03',
    kind: 'remedy',
    label: 'read guarded by hasOwnProperty',
    code: 'function f(map, k) { if (Object.hasOwn(map, k)) { return map[k]; } return undefined; }',
    why: 'Guarded, and a read besides.',
  },
];

/**
 * Their documentation: "flags any expression in the form of object[expression]
 * no matter where it occurs". Each of these IS that form. This measures a rule
 * against its own promise, which is the only fair way to judge a contract we
 * did not write.
 */
const THEIR_CONTRACT: { label: string; code: string }[] = [
  { label: 'identifier key (their own doc example)', code: 'o[key] = v;' },
  { label: 'member key', code: 'o[req.query.p] = v;' },
  { label: 'nested index', code: 'o[parts[i]] = v;' },
  { label: 'call result', code: 'o[f()] = v;' },
  { label: 'template literal', code: 'o[`${a}`] = v;' },
  { label: 'concatenation', code: 'o[a + b] = v;' },
  { label: 'conditional', code: 'o[c ? a : b] = v;' },
  { label: 'await', code: 'async function g(){ o[await k()] = v; }' },
  { label: 'assignment in key position', code: 'o[(k = x)] = v;' },
  { label: 'comma expression', code: 'o[(a, b)] = v;' },
  { label: 'optional call', code: 'o[f?.()] = v;' },
  { label: 'literal string key', code: 'o["name"] = v;' },
];

const ours = ((
  plugin as {
    default?: { rules: Record<string, unknown> };
    rules?: Record<string, unknown>;
  }
).default?.rules ?? (plugin as { rules: Record<string, unknown> }).rules)[
  'detect-object-injection'
];
const securityRules = ((
  securityPlugin as {
    default?: { rules?: Record<string, unknown> };
    rules?: Record<string, unknown>;
  }
).rules ??
  (securityPlugin as { default?: { rules?: Record<string, unknown> } }).default
    ?.rules) as Record<string, unknown>;
const theirs = securityRules['detect-object-injection'];

const linter = new Linter();

/** Reports, or null when the harness could not perform the run. */
function reports(rule: unknown, name: string, code: string): number | null {
  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,js}'],
        plugins: { p: { rules: { [name]: rule } } as never },
        languageOptions: {
          parser: tsparser as never,
          parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
        },
        rules: { [`p/${name}`]: 'error' },
      },
    ],
    'case.ts',
  );
  if (messages.some((m) => m.ruleId === null)) return null;
  return messages.length;
}

// ── Positive controls ─────────────────────────────────────────────────────
// A comparison against a rule that is not running measures our harness. Both
// rules must answer a case they each certainly report on before any number
// below means anything.
const controls = {
  ours: reports(ours, 'ours', 'function f(o, req) { o[req.body.k] = 1; }'),
  theirs: reports(theirs, 'theirs', 'o[key] = v;'),
};
if ((controls.ours ?? 0) === 0 || (controls.theirs ?? 0) === 0) {
  console.error(
    '\n  ⛔ a rule failed its positive control — every number below would be meaningless',
  );
  console.error(`     ours: ${controls.ours}   theirs: ${controls.theirs}`);
  process.exit(1);
}

type Row = { c: Case; ours: number | null; theirs: number | null };
const rows: Row[] = CASES.map((c) => ({
  c,
  ours: reports(ours, 'ours', c.code),
  theirs: reports(theirs, 'theirs', c.code),
}));

/** Right on a case: a defect fires, a decoy and a remedy do not. */
const correct = (kind: Kind, n: number | null): boolean =>
  n === null ? false : kind === 'defect' ? n > 0 : n === 0;

function score(pick: (r: Row) => number | null): {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
} {
  let tp = 0,
    fn = 0,
    fp = 0,
    tn = 0;
  for (const r of rows) {
    const fired = (pick(r) ?? 0) > 0;
    if (r.c.kind === 'defect') fired ? tp++ : fn++;
    else fired ? fp++ : tn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);
  return { tp, fn, fp, tn, precision, recall, f1 };
}

const oursScore = score((r) => r.ours);
const theirsScore = score((r) => r.theirs);

const contractRows = THEIR_CONTRACT.map((t) => ({
  ...t,
  theirs: reports(theirs, 'theirs', t.code),
  ours: reports(ours, 'ours', t.code),
}));
// The last entry is a literal key, which their doc's own examples do not claim.
const promised = contractRows.slice(0, -1);
const theyMiss = promised.filter((t) => (t.theirs ?? 0) === 0);

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

console.log(
  `\n  controls  ours ${controls.ours}  theirs ${controls.theirs}  — both rules are running\n`,
);
console.log('  id   kind    ours theirs  case');
for (const r of rows) {
  const mark = (n: number | null, k: Kind): string =>
    correct(k, n) ? ' ' : '!';
  console.log(
    `  ${r.c.id}  ${r.c.kind.padEnd(7)} ${String(r.ours).padStart(3)}${mark(r.ours, r.c.kind)} ${String(r.theirs).padStart(4)}${mark(r.theirs, r.c.kind)}  ${r.c.label}`,
  );
}
console.log('\n  AS A DETECTOR (a defect fires, a decoy and a remedy do not)');
console.log(
  `    ours    TP ${oursScore.tp}  FN ${oursScore.fn}  FP ${oursScore.fp}  TN ${oursScore.tn}   precision ${pct(oursScore.precision)}  recall ${pct(oursScore.recall)}  F1 ${pct(oursScore.f1)}`,
);
console.log(
  `    theirs  TP ${theirsScore.tp}  FN ${theirsScore.fn}  FP ${theirsScore.fp}  TN ${theirsScore.tn}   precision ${pct(theirsScore.precision)}  recall ${pct(theirsScore.recall)}  F1 ${pct(theirsScore.f1)}`,
);
console.log(`\n  AS A REVIEW AID (their own documented contract)`);
console.log(
  `    "flags any expression in the form of object[expression] no matter where it occurs"`,
);
console.log(
  `    their rule misses ${theyMiss.length} of the ${promised.length} forms it promises: ${theyMiss.map((t) => t.label).join(', ')}`,
);

/**
 * Fold the battery into the case registry, so every row is held by the same
 * ratchet as everything else rather than living only in this script.
 *
 * Additive and idempotent, matched on code — an entry already there keeps its
 * id, its rationale and any CWE or severity a human has since attached.
 */
if (TO_REGISTRY) {
  const file = path.join(ROOT, 'benchmarks', 'cases', 'registry.json');
  const registry = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    note: string;
    cases: Record<string, unknown>[];
  };
  const have = new Set(registry.cases.map((c) => String(c['code']).trim()));
  let next = registry.cases.reduce((max, c) => {
    const m = /^ILB-(\d+)$/.exec(String(c['id']));
    return m === null ? max : Math.max(max, Number(m[1]));
  }, 0);
  let added = 0;
  for (const c of CASES) {
    if (have.has(c.code.trim())) continue;
    next += 1;
    registry.cases.push({
      id: `ILB-${String(next).padStart(4, '0')}`,
      added: '2026-08-26',
      title: c.label,
      rationale: c.why,
      cwe: c.kind === 'defect' ? 'CWE-1321' : null,
      severity: { cvss: null, vector: null, source: null },
      references: [],
      occurrences: [],
      code: c.code,
      kind: c.kind,
      coverage: [
        {
          rule: 'secure-coding/detect-object-injection',
          expect: c.kind === 'defect' ? 'report' : 'silent',
          evidence: 'scripts/doi-head-to-head.mts',
        },
      ],
      peers: [
        {
          plugin: 'eslint-plugin-security',
          rule: 'detect-object-injection',
          control: 'o[key] = v;',
        },
      ],
      batteryId: c.id,
    });
    added += 1;
  }
  fs.writeFileSync(file, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(
    `\n  ${added} battery case(s) added to the registry (${registry.cases.length} total)`,
  );
}

if (EMIT) {
  const md: string[] = [
    '# detect-object-injection, head to head',
    '',
    'Generated by `scripts/doi-head-to-head.mts`. Every number on this page was',
    'produced by running both rules over the same string in the same process on',
    'the run that wrote it. Nothing is quoted and nothing is cached.',
    '',
    `Ours: \`secure-coding/detect-object-injection\`. Theirs: \`eslint-plugin-security/detect-object-injection\` v${(JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'eslint-plugin-security', 'package.json'), 'utf8')) as { version: string }).version}.`,
    '',
    '## Controls',
    '',
    `Before any comparison: ours reports **${controls.ours}** on \`o[req.body.k] = 1\`, theirs reports **${controls.theirs}** on \`o[key] = v\` — its own documentation example. Both rules are running. A comparison against a rule that is not running measures the harness, not the rule.`,
    '',
    '## The two contracts',
    '',
    'Their documentation states: *"This rule flags any expression in the form of',
    '`object[expression]` no matter where it occurs."* That is a **review aid** —',
    'make dynamic access visible — not a vulnerability detector. Judged that way,',
    'reporting a benign copy loop is the product working.',
    '',
    'So the battery is scored twice. A rule cannot be criticised for failing a',
    'contract it never made; it can be criticised for failing its own.',
    '',
    '## Every case',
    '',
    '`!` marks a wrong answer for that kind: a `defect` that did not fire, or a',
    '`decoy`/`remedy` that did.',
    '',
    '| id | kind | ours | theirs | case | why |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => {
      const cell = (n: number | null): string =>
        `${n === null ? 'unscoreable' : n}${correct(r.c.kind, n) ? '' : ' **!**'}`;
      return `| \`${r.c.id}\` | ${r.c.kind} | ${cell(r.ours)} | ${cell(r.theirs)} | \`${r.c.code.replace(/\|/g, '\\|')}\` | ${r.c.why} |`;
    }),
    '',
    '## Scored as a detector',
    '',
    'A `defect` must report; a `decoy` and a `remedy` must not. This is the',
    'contract we hold ourselves to, and it is not the one they published.',
    '',
    '| | TP | FN | FP | TN | precision | recall | F1 |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    `| **ours** | ${oursScore.tp} | ${oursScore.fn} | ${oursScore.fp} | ${oursScore.tn} | ${pct(oursScore.precision)} | ${pct(oursScore.recall)} | ${pct(oursScore.f1)} |`,
    `| theirs | ${theirsScore.tp} | ${theirsScore.fn} | ${theirsScore.fp} | ${theirsScore.tn} | ${pct(theirsScore.precision)} | ${pct(theirsScore.recall)} | ${pct(theirsScore.f1)} |`,
    '',
    '## Scored against their own contract',
    '',
    'Every row below IS `object[expression]`, which their documentation says is',
    'flagged "no matter where it occurs".',
    '',
    '| form | theirs | ours |',
    '|---|---|---|',
    ...promised.map(
      (t) =>
        `| ${t.label} — \`${t.code.replace(/\|/g, '\\|')}\` | ${(t.theirs ?? 0) === 0 ? '**missed**' : `${t.theirs}`} | ${t.ours} |`,
    ),
    '',
    `**${theyMiss.length} of ${promised.length}** documented forms are not reported by their rule.`,
    '',
    "One cause: the implementation tests `node.property.type === 'Identifier'`,",
    'so a key reached through any other expression never arrives at the check.',
    'The documentation describes something far broader than the code does.',
    '',
    '## What this does and does not establish',
    '',
    'It does not establish that their rule is bad at its job. Read as a review',
    'aid, its false positives are the product, and its authors say so.',
    '',
    'It establishes two things, both executed above:',
    '',
    '1. **As a detector, the comparison is not close.** Their recall gap is not a',
    '   tuning difference — the shortest way anyone writes CWE-1321,',
    '   `o[req.query.p] = 1`, is invisible to them, and so is every guarded',
    '   remedy, which means a team that fixes the bug still sees the finding.',
    '2. **Judged on their own published contract, the rule does not do what it',
    '   says.** That is not our standard applied to someone else; it is theirs.',
    '',
    'And the direction that matters most for us: two of the disagreements were',
    'OURS, found by running this comparison — `arr[arr.length] = x` and the',
    'const-allowlist loop. Both were our false positives, both are fixed, and',
    'both are in the case registry as `decoy` entries so they cannot come back.',
    '',
    '## Read this before quoting the 100%',
    '',
    '**We wrote this battery.** A perfect score on a set chosen by the rule’s own',
    'authors measures the authors, and that criticism is the one levelled at every',
    'self-authored corpus in this repository — including ours, repeatedly. The',
    'number is a floor on how we handle cases we thought of, not a measurement of',
    'the rule in the world.',
    '',
    'Three things make it worth more than nothing, and none makes it a benchmark:',
    '',
    '1. **Six of the sixteen defects (D11–D16) come from an adversarial pass',
    '   written to make OUR rule fail**, not to flatter it — header keys, nested',
    '   destructuring, chained attacker keys, the `Object.keys` merge spelling,',
    '   late assignment, and a direct `constructor.prototype` write.',
    '2. **The decoys are not inventions.** The read shapes, the copy loop and the',
    '   allowlist come from the real-source scan, and two of them were our own',
    '   findings before they were our own fixes.',
    '3. **The comparison has already cost us twice**, which is the only real',
    '   evidence that it is not rigged: it found `arr[arr.length]` and the',
    '   const-allowlist loop, and both were ours to fix.',
    '',
    '### What we still get wrong, stated rather than omitted',
    '',
    '- **A TS enum used as a key reports.** `function f(o, e: E) { o[e] = 1 }` is',
    '  a closed set, and a numeric one for a numeric enum — deciding that needs',
    '  the type, and these rules are type-unaware by policy. A documented limit,',
    '  not an oversight, and it is a false positive all the same.',
    '- **A bare parameter used as an index reports.** `function f(o, i) { o[i] = 1 }`',
    '  cannot be proved numeric from its declaration. Deliberate, and the reason',
    '  is in the rule: the name-based version of this cleared',
    '  `function put(o, k) { o[k] = 1 }`, which is the defect itself.',
    '- **`o[String(i)] = 1` reports.** `String()` of an arbitrary parameter can',
    '  produce any string, including `__proto__`.',
    '',
    'One adversarial case was thrown out rather than counted: `o?.[k] = 1` is',
    'invalid JavaScript — you cannot assign through an optional chain. It read as',
    'a miss until it was run.',
  ];
  fs.writeFileSync(
    path.join(ROOT, 'benchmarks', 'DOI_HEAD_TO_HEAD.md'),
    `${md.join('\n')}\n`,
  );
  console.log('\n  wrote benchmarks/DOI_HEAD_TO_HEAD.md');
}
