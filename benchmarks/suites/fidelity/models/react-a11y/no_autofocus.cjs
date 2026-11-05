const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Input: 'input',
  Div: 'div',
  Button: 'button',
  Component: 'TextInput',
  Member: 'Ui.TextInput',
};
const VALUE = {
  Bare: '',
  BracedTrue: '={true}',
  LitTrue: '="true"',
  BracedFalse: '={false}',
  Dynamic: '={flag}',
  Undef: '={undefined}',
};

module.exports = {
  rule: 'no-autofocus',
  // Values 5 x 5 x 2; Names 2.
  domain: 50 + 2,
  traces: 600,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'value', 'opt', 'attrName']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'IgnoreNonDOM' ? { ignoreNonDOM: true } : undefined,
  code: (s) => {
    const t = ELEM[tag(s.elem)];
    const a = `${tag(s.attrName) === 'Lower' ? 'autofocus' : 'autoFocus'}${VALUE[tag(s.value)]}`;
    return program(el(t, [a], t === 'input' ? '' : 'x'), {
      pre: ["import { TextInput, Ui } from './ui';"],
    });
  },
};
