const { tag } = require('../../lib.cjs');

module.exports = {
  domain: 33,
  traces: 350,
  rule: 'detect-non-literal-regexp',
  key: (s) =>
    `${tag(s.call)}|${tag(s.pattern)}|allowLiterals=${s.allowLiterals}`,
  config: (s) => ({ allowLiterals: s.allowLiterals }),
  code: (s) => {
    const ctor = {
      NewRegExp: 'new RegExp',
      CallRegExp: 'RegExp',
      NewGlobalThis: 'new globalThis.RegExp',
    }[tag(s.call)];
    const p = tag(s.pattern);
    const pre =
      {
        ConstBound: "const source = 'ab+c';",
        ConstConcat: "const P = '^v';",
        ConstTemplate: "const P = '^v';",
        ConstJoin: "const EXTS = ['png', 'jpg'];",
        LetReassigned: "let pat = 'a';\n  pat = getPattern();",
      }[p] ?? '';
    const arg = {
      Literal: "'^[a-z]+$'",
      ConstBound: 'source',
      ConstConcat: "P + '\\\\d+'",
      ConstTemplate: '`${P}\\\\d+`',
      ConstJoin: "EXTS.join('|')",
      LoopCounter: "'{' + i + '}'",
      Param: 'userPattern',
      Imported: 'importedPattern',
      ConfigMember: 'config.pattern',
      LetReassigned: 'pat',
    }[p];
    const use =
      p === 'LoopCounter'
        ? `for (let i = 0; i < 3; i++) out.push(${ctor}(${arg}));`
        : `out.push(${ctor}(${arg}));`;
    return `import { importedPattern } from './patterns';\ndeclare const config: { pattern: string };\ndeclare function getPattern(): string;\nexport function build(userPattern: string) {\n  const out: RegExp[] = [];\n  ${pre}\n  ${use}\n  return out;\n}\n`;
  },
};
