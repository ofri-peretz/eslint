const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-math-random-crypto',
  domain: 84, // 4 spellings x 7 names x 3 contexts
  traces: 1200,
  key: (s) => `${tag(s.spelling)}|${tag(s.name)}|${tag(s.context)}`,
  config: () => ({}),
  code: (s) => {
    const [pre, rnd] = {
      Direct: ['', 'Math.random()'],
      Bracket: ['', "Math['random']()"],
      Destructured: ['const { random } = Math;\n', 'random()'],
      GlobalThis: ['', 'globalThis.Math.random()'],
    }[tag(s.spelling)];
    const expr = `${rnd}.toString(36).slice(2)`;
    const name = {
      SessionToken: 'sessionToken',
      Salt: 'salt',
      Iv: 'iv',
      Nonce: 'nonce',
      RequestId: 'requestId',
      JitterMs: 'jitterMs',
      Slot: 'slot',
    }[tag(s.name)];
    const cap = name[0].toUpperCase() + name.slice(1);
    return (
      pre +
      {
        VarDecl: `export const ${name} = ${expr};`,
        PropAssign: `export function fill(session: Record<string, string>) {\n  session.${name} = ${expr};\n}`,
        ReturnFrom: `export function generate${cap}() {\n  return ${expr};\n}`,
      }[tag(s.context)]
    );
  },
  model: (s) => s.verdict,
};

// Test-file dimension: x3 domain, see lib.cjs `withTestFile`.
module.exports = withTestFile(base, { option: 'allowInTests', flip: false });
