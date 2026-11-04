const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const OPERAND = {
  Str: "'id-'",
  Tmpl: '`#`',
  Ident: 'name',
  Num: '2',
  Call: 'next()',
};

module.exports = {
  rule: 'prefer-template-literal',
  domain: 5 * 5 * 6,
  traces: 1200,
  key: keyOf('first', 'second', 'third'),
  code: (s) => {
    const ops = [s.first, s.second, s.third]
      .map(tag)
      .filter((o) => o !== 'Absent')
      .map((o) => OPERAND[o]);
    return src(
      'declare const name: string;',
      'declare function next(): number;',
      `export const label = ${ops.join(' + ')};`,
    );
  },
};
