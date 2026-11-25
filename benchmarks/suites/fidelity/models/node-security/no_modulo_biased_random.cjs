const { tag } = require('../../lib.cjs');

const A70 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

// Each source: [module-level lines, statements in the function, collection].
const SOURCE = {
  RandomBytes: [
    "import crypto from 'node:crypto';",
    '',
    'crypto.randomBytes(32)',
  ],
  NamedImport: ["import { randomBytes } from 'crypto';", '', 'randomBytes(32)'],
  WebU8: ['', '', 'crypto.getRandomValues(new Uint8Array(32))'],
  WebU32: ['', '', 'globalThis.crypto.getRandomValues(new Uint32Array(32))'],
  FilledInPlace: [
    '',
    'const buf = new Uint8Array(32);\n  crypto.getRandomValues(buf);',
    'buf',
  ],
  NotRandom: ['', '', "Buffer.from('abcdefghijklmnopqrstuvwxyz')"],
  Shadowed: [
    'function randomBytes(n) { return new Uint8Array(n); }',
    '',
    'randomBytes(32)',
  ],
};

const DIVISOR = {
  D10: '10',
  D16: '16',
  Len70: 'A70.length',
  Unknown: 'n',
  D256: '256',
};

function access(a, coll, stmt) {
  return {
    Index: `const bytes = ${coll};\n  for (let i = 0; i < bytes.length; i++) {\n    ${stmt('bytes[i]')}\n  }`,
    ForOf: `for (const b of ${coll}) {\n    ${stmt('b')}\n  }`,
    MapCallback: `Array.from(${coll}).map((b) => {\n    ${stmt('b')}\n  });`,
    FromCallback: `Array.from(${coll}, (b) => {\n    ${stmt('b')}\n  });`,
  }[a];
}

module.exports = {
  rule: 'no-modulo-biased-random',
  domain: 560, // 7 sources x 4 accesses x 5 divisors x 2 uses x 2 guards
  traces: 3200,
  key: (s) =>
    [s.source, s.access, s.divisor, s.use, s.guard].map(tag).join('|'),
  config: () => undefined,
  code: (s) => {
    const [head, pre, coll] = SOURCE[tag(s.source)];
    const d = DIVISOR[tag(s.divisor)];
    const use = (x) =>
      tag(s.use) === 'Position' ? `out.push(chars[${x}]);` : `total += ${x};`;
    const stmt = (el) =>
      tag(s.guard) === 'Rejection'
        ? `if (${el} < 250) ${use(`${el} % ${d}`)}`
        : use(`${el} % ${d}`);
    return `${head}
const A70 = '${A70}';
export function gen(n, chars) {
  const out = [];
  let total = 0;
  ${pre}
  ${access(tag(s.access), coll, stmt)}
  return [out, total];
}
`;
  },
};
