const { tag } = require('../../lib.cjs');
const { FILE, program, SPELL, el } = require('../../jsx.cjs');

const ELEM = {
  Div: 'div',
  Button: 'button',
  Input: 'input',
  Component: 'Button',
  Member: 'Ui.Button',
};
const VALUE = {
  Lit: SPELL.Lit('s'),
  Braced: SPELL.Braced('s'),
  Template: SPELL.Template('s'),
  Cond: SPELL.Cond('s'),
  Dynamic: SPELL.Dynamic(),
  Empty: '""',
  Undef: '{undefined}',
};

module.exports = {
  rule: 'no-access-key',
  // Values 3 x 6; Names 2.
  domain: 18 + 2,
  traces: 400,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'value', 'attrName']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const t = ELEM[tag(s.elem)];
    const a = `${tag(s.attrName) === 'Lower' ? 'accesskey' : 'accessKey'}=${VALUE[tag(s.value)]}`;
    return program(el(t, [a], t === 'input' ? '' : 'x'), {
      pre: ["import { Button, Ui } from './ui';"],
    });
  },
};
