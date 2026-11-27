const { tag, withTestFile } = require('../../lib.cjs');

const base = {
  pkg: 'eslint-plugin-node-security',
  rule: 'no-math-random-crypto',
  domain: 87, // 4 spellings x 7 names x 3 contexts, + 3 flows on one anchor
  traces: 1200,
  key: (s) =>
    `${tag(s.spelling)}|${tag(s.name)}|${tag(s.context)}|${tag(s.flow)}`,
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
    // Where the draw goes: a pick among existing values, a timer delay and a
    // sampling decision are not secrets, however the binding is named.
    const flow = {
      Plain: undefined,
      Selection: `declare const pool: string[];\nexport const ${name} = pool[Math.floor(Math.random() * pool.length)];`,
      Timer: `declare function done(): void;\nconst ${name} = 500 + Math.random() * 500;\nsetTimeout(done, ${name});`,
      Sampling: `export const ${name} = Math.random() < 0.1;`,
    }[tag(s.flow)];
    if (flow !== undefined) return flow;
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
