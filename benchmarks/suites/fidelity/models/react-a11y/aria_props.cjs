const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const NAME = {
  Label: 'aria-label',
  LabelledBy: 'aria-labelledby',
  DescribedBy: 'aria-describedby',
  Hidden: 'aria-hidden',
  Expanded: 'aria-expanded',
  Controls: 'aria-controls',
  Current: 'aria-current',
  ErrorMessage: 'aria-errormessage',
  RoleDescription: 'aria-roledescription',
  Description: 'aria-description',
  LabeledByTypo: 'aria-labeledby',
  Foo: 'aria-foo',
  LabelBy: 'aria-label-by',
  Hiddenn: 'aria-hiddenn',
};
const ELEM = {
  Div: (a) => el('div', [a], 'x'),
  Input: (a) => el('input', [a]),
  Component: (a) => el('Button', [a], 'x'),
  Member: (a) => el('Ui.Button', [a], 'x'),
};

module.exports = {
  rule: 'aria-props',
  domain: 14 * 4 * 4,
  traces: 1500,
  filename: FILE,
  key: (s) =>
    ['name', 'elem', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(
      ELEM[tag(s.elem)](attr(NAME[tag(s.name)], 'true', tag(s.spelling))),
      {
        pre: ["import { Button, Ui } from './ui';"],
      },
    ),
};
