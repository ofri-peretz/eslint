const { tag } = require('../../lib.cjs');

/**
 * source -> { mod: module-level lines, head: handler parameters, body: lines
 * at the top of the handler, raw: an expression holding the header's values,
 * register: the call the implementation object is passed to }.
 */
const SOURCE = {
  Handler: { head: 'call, cb', raw: "call.metadata.get('h')" },
  ConstMd: {
    head: 'call, cb',
    body: ['const md = call.metadata;'],
    raw: "md.get('h')",
  },
  Destructured: { head: '{ metadata }, cb', raw: "metadata.get('h')" },
  HelperParam: {
    mod: ["function header(m) { return m.get('h'); }"],
    head: 'call, cb',
    raw: 'header(call.metadata)',
  },
  IifeParam: { head: 'call, cb', raw: "((m) => m.get('h'))(call.metadata)" },
  NotHandler: {
    head: 'call, cb',
    raw: "call.metadata.get('h')",
    register: 'router.register',
  },
  SecondParam: { head: 'call, cb', raw: "cb.metadata.get('h')" },
  OtherMember: { head: 'call, cb', raw: "call.headers.get('h')" },
  ThisMember: { head: 'call, cb', raw: "this.metadata.get('h')" },
};

/** path -> (raw) => { mod?, body?, id: the identity expression }. */
const PATH = {
  Direct: (r) => ({ id: `${r}[0]` }),
  OptionalIndex: (r) => ({ id: `${r}?.[0]` }),
  StringWrap: (r) => ({ id: `String(${r}[0] ?? '')` }),
  Template: (r) => ({ id: `\`\${${r}[0]}\`.trim()` }),
  ArrayDestructure: (r) => ({ body: [`const [v] = ${r};`], id: 'v' }),
  Ternary: (r) => ({ body: [`const v = ${r}[0];`], id: 'v ? v : null' }),
  HelperValue: (r) => ({
    mod: ['function norm(x) { return x.toLowerCase(); }'],
    id: `norm(${r}[0])`,
  }),
  Lookup: (r) => ({ id: `TOKENS[${r}[0]]` }),
  Verifier: (r) => ({ id: `verify(${r}[0])` }),
  Reassigned: (r) => ({
    body: [`let v = ${r}[0];`, 'v = lookup(v);'],
    id: 'v',
  }),
};

/** compare -> (id) => { mod?, body: lines that use the identity }. */
const COMPARE = {
  RecordField: (id) => ({
    body: [
      'const acc = ACCOUNTS[rid];',
      `if (acc.owner !== ${id}) return cb(7);`,
    ],
  }),
  EnvSecret: (id) => ({
    body: [`if (${id} !== process.env.KEY) return cb(16);`],
  }),
  ConfigConst: (id) => ({
    mod: ["const CONFIG = { key: 'k' };"],
    body: [`if (${id} !== CONFIG.key) return cb(16);`],
  }),
  NoBranch: (id) => ({
    body: [
      'const acc = ACCOUNTS[rid];',
      `const same = acc.owner === ${id};`,
      'log(same);',
    ],
  }),
  Ordering: (id) => ({
    body: [
      'const acc = ACCOUNTS[rid];',
      `if (acc.level < ${id}) return cb(7);`,
    ],
  }),
};

function code(s) {
  const src = SOURCE[tag(s.source)];
  const path = PATH[tag(s.path)](src.raw);
  const cmp = COMPARE[tag(s.compare)](`(${path.id})`);
  const mod = [...(src.mod ?? []), ...(path.mod ?? []), ...(cmp.mod ?? [])];
  const body = [
    ...(src.body ?? []),
    ...(path.body ?? []),
    ...cmp.body,
    'cb(null, {});',
  ];
  return [
    ...mod,
    `${src.register ?? 'server.addService'}(svc, {`,
    `  Get(${src.head}) {`,
    ...body.map((line) => `    ${line}`),
    '  },',
    '});',
  ].join('\n');
}

module.exports = {
  rule: 'no-identity-from-metadata',
  domain: 9 * 10 * 5, // sources x paths x comparisons
  traces: 3000,
  key: (s) => `${tag(s.source)}|${tag(s.path)}|${tag(s.compare)}`,
  code,
};
