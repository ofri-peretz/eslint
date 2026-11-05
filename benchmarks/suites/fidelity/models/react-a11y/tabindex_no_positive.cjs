const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const VAL = { Zero: '0', Neg: '-1', One: '1', Big: '5' };
const SPELL = {
  Lit: (v) => `"${v}"`,
  BracedNum: (v) => `{${v}}`,
  BracedStr: (v) => `{"${v}"}`,
  Template: (v) => `{\`${v}\`}`,
  Cond: (v) => `{flag ? ${v} : ${v}}`,
  Dynamic: () => '{value}',
};
const ELEM = {
  Div: (a) => el('div', [a], 'x'),
  Button: (a) => el('button', [a], 'x'),
  Anchor: (a) => el('a', ['href="/x"', a], 'x'),
};

module.exports = {
  rule: 'tabindex-no-positive',
  // (4 values x 5 static spellings + Dynamic) x 3 elems x 2 names
  domain: 21 * 3 * 2,
  traces: 1000,
  filename: FILE,
  key: (s) =>
    ['value', 'spelling', 'elem', 'attrName']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const name = tag(s.attrName) === 'Camel' ? 'tabIndex' : 'tabindex';
    const a = `${name}=${SPELL[tag(s.spelling)](VAL[tag(s.value)])}`;
    return program(ELEM[tag(s.elem)](a));
  },
};
