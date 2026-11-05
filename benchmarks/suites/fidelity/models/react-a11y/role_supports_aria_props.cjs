const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const PROP = {
  AriaLabel: 'aria-label="Name"',
  AriaHidden: 'aria-hidden="false"',
  AriaChecked: 'aria-checked="true"',
  AriaPressed: 'aria-pressed="true"',
  AriaExpanded: 'aria-expanded="true"',
  AriaValuenow: 'aria-valuenow="5"',
  AriaLevel: 'aria-level="2"',
};
const CTX = {
  DivButton: (p, sp) =>
    el('div', [attr('role', 'button', sp), 'tabIndex={0}', p], 'x'),
  DivCheckbox: (p, sp) =>
    el('div', [attr('role', 'checkbox', sp), 'tabIndex={0}', p], 'x'),
  DivSlider: (p, sp) =>
    el('div', [attr('role', 'slider', sp), 'tabIndex={0}', p], 'x'),
  AnchorHref: (p) => el('a', ['href="/x"', p], 'x'),
  NativeCheckbox: (p) => el('input', ['type="checkbox"', p]),
  NativeButton: (p) => el('button', ['type="button"', p], 'x'),
  H1: (p) => el('h1', [p], 'Title'),
  DivNoRole: (p) => el('div', [p], 'x'),
  Member: (p) => el('Ui.Widget', ['role="button"', p], 'x'),
};

module.exports = {
  rule: 'role-supports-aria-props',
  // 3 explicit-role ctxs x 7 props x 3 spellings + 6 other ctxs x 7 props
  domain: 3 * 7 * 3 + 6 * 7,
  traces: 1300,
  filename: FILE,
  key: (s) =>
    ['ctx', 'prop', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(CTX[tag(s.ctx)](PROP[tag(s.prop)], tag(s.spelling)), {
      pre: ["import { Ui } from './ui';"],
    }),
};
