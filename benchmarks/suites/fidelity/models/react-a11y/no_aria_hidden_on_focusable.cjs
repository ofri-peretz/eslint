const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const HID = {
  TrueLit: 'aria-hidden="true"',
  TrueBraced: 'aria-hidden={true}',
  Bare: 'aria-hidden',
  FalseLit: 'aria-hidden="false"',
  FalseBraced: 'aria-hidden={false}',
  Dyn: 'aria-hidden={value}',
};
const CTX = {
  Button: (h) => el('button', ['type="button"', h], 'x'),
  AHref: (h) => el('a', ['href="/x"', h], 'x'),
  ABare: (h) => el('a', [h], 'x'),
  Input: (h) => el('input', ['type="text"', h]),
  InputHidden: (h) => el('input', ['type="hidden"', 'name="id"', h]),
  Select: (h) => el('select', [h], '<option>a</option>'),
  Textarea: (h) => el('textarea', [h]),
  Div: (h) => el('div', [h], 'x'),
  DivTab0: (h) => el('div', ['tabIndex={0}', h], 'x'),
  DivTabNeg: (h) => el('div', ['tabIndex={-1}', h], 'x'),
  ButtonTabNeg: (h) => el('button', ['type="button"', 'tabIndex={-1}', h], 'x'),
  ButtonDisabled: (h) => el('button', ['type="button"', 'disabled', h], 'x'),
  Component: (h) => el('Button', [h], 'x'),
  Member: (h) => el('Ui.Button', [h], 'x'),
};

module.exports = {
  rule: 'no-aria-hidden-on-focusable',
  domain: 14 * 6,
  traces: 800,
  filename: FILE,
  key: (s) => ['ctx', 'hid'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(CTX[tag(s.ctx)](HID[tag(s.hid)]), {
      pre: ["import { Button, Ui } from './ui';"],
    }),
};
