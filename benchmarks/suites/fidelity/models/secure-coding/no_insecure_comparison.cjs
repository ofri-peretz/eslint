const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 120,
  traces: 1000,
  rule: 'no-insecure-comparison',
  key: (s) =>
    `${tag(s.op)}|${tag(s.left)}|${tag(s.right)}|loose=${s.reportLoose}`,
  config: (s) => ({ reportLooseEquality: s.reportLoose }),
  code: (s) => {
    const op = { Eq: '==', Neq: '!=', StrictEq: '===' }[tag(s.op)];
    const l = {
      Param: 'value',
      ConstStr: 'role',
      TemplateLit: '`admin`',
      Secret: 'password',
      Monkey: 'monkey',
    }[tag(s.left)];
    const r = {
      StrLit: "'admin'",
      NullLit: 'null',
      UndefinedLit: 'undefined',
      OtherVar: 'provided',
    }[tag(s.right)];
    return `export function check(value: any, password: any, monkey: any, provided: any) {\n  const role = 'user';\n  if (${l} ${op} ${r}) {\n    return 1;\n  }\n  return role;\n}\n`;
  },
};
