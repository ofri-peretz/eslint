const { tag } = require('../../lib.cjs');

const cp = (n) => String.fromCodePoint(n);
const CH = {
  C115F: cp(0x115f),
  C1160: cp(0x1160),
  C17B4: cp(0x17b4),
  C17B5: cp(0x17b5),
  C3164: cp(0x3164),
  CFFA0: cp(0xffa0),
  Visible3131: cp(0x3131),
  Escaped3164: '\\u3164',
  Zwsp: cp(0x200b),
};

module.exports = {
  domain: 44,
  traces: 400,
  rule: 'no-invisible-characters',
  key: (s) => `${tag(s.ch)}|${tag(s.where)}`,
  config: () => undefined,
  code: (s) => {
    const c = CH[tag(s.ch)];
    return {
      Identifier: `const adm${c}in = 1;\nexport const v = adm${c}in;\n`,
      StringLit: `export const greeting = 'hello${c}world';\n`,
      TemplateLit: `export const greeting = \`hello${c}world\`;\n`,
      RegexLit: `export const re = /hello${c}world/;\n`,
      Comment: `// hidden${c}comment\nexport const v = 1;\n`,
    }[tag(s.where)];
  },
};
