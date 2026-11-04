const { tag, withTestFile } = require('../../lib.cjs');
const { keyOf } = require('../../reliability.cjs');

const EVIDENCE = {
  UninitLet: ['let hit: User | undefined;'],
  NullInit: ['let hit: User | null = null;'],
  UndefinedInit: ['let hit: User | undefined = undefined;'],
  ConditionalWrite: [
    'let hit: User | null = null;',
    'if (flag) {',
    '  hit = pick();',
    '}',
  ],
  ArrayFind: ['const hit = users.find((u) => u.id === id);'],
  StringMatch: ['const hit = text.match(/(\\d+)/);'],
  RegexExec: ['const hit = /(\\d+)/.exec(text);'],
  QuerySelector: ["const hit = document.querySelector('#user');"],
  GetElementById: ["const hit = document.getElementById('user');"],
  NoEvidence: ['const hit = load(id);'],
  NewObject: ['const hit = new Map<string, number>();'],
};

// The read itself, given the expression it dereferences.
const DEREF = {
  Member: (v) => [`out = ${v}.name;`],
  Bracket: (v) => [`out = ${v}['name'];`],
  MethodCall: (v) => [`out = ${v}.toString();`],
  Destructure: (v) => [`const { name } = ${v};`, 'out = name;'],
};

function guarded(guard, deref) {
  const read = DEREF[deref];
  const inline = (v) => read(v)[0].replace(/^out = |;$/g, '');
  switch (guard) {
    case 'Unguarded':
      return read('hit');
    case 'OptionalChain':
      return ['out = hit?.name;'];
    case 'IfTruthy':
      return ['if (hit) {', ...read('hit').map((l) => `  ${l}`), '}'];
    case 'AndGuard':
      return [`out = hit && ${inline('hit')};`];
    case 'Ternary':
      return [`out = hit ? ${inline('hit')} : '';`];
    case 'NotNullCheck':
      return ['if (hit != null) {', ...read('hit').map((l) => `  ${l}`), '}'];
    case 'EarlyReturn':
      return ['if (!hit) return out;', ...read('hit')];
    case 'EarlyThrow':
      return ["if (hit == null) throw new Error('no user');", ...read('hit')];
    case 'NonNullAssertion':
      return read('hit!');
    case 'GuardOtherBinding':
      return ['if (other) {', ...read('hit').map((l) => `  ${l}`), '}'];
    default: // NullishFallback
      return read('(hit ?? fallback)');
  }
}

module.exports = withTestFile(
  {
    rule: 'no-missing-null-checks',
    // Evidences 11; Guards 11 x 2 evidences; Derefs 4 x 2 evidences x 2 guards.
    domain: 11 + 22 + 16,
    traces: 900,
    key: keyOf('focus', 'evidence', 'guard', 'deref'),
    code: (s) =>
      [
        'interface User { id: number; name: string }',
        'declare function pick(): User;',
        'declare function load(id: number): User;',
        "const fallback: User = { id: 0, name: 'guest' };",
        'export function show(users: User[], text: string, id: number, flag: boolean, other: unknown) {',
        '  let out: unknown;',
        ...EVIDENCE[tag(s.evidence)].map((l) => `  ${l}`),
        ...guarded(tag(s.guard), tag(s.deref)).map((l) => `  ${l}`),
        // A write AFTER the read cannot un-read the null.
        ...(['NullInit', 'UndefinedInit'].includes(tag(s.evidence))
          ? ['  hit = pick();']
          : []),
        '  return out;',
        '}',
        '',
      ].join('\n'),
  },
  { option: 'ignoreInTests', flip: false },
);
