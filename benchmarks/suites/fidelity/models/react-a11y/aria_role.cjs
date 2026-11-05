const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const VAL = {
  Button: 'button',
  Navigation: 'navigation',
  Presentation: 'presentation',
  None: 'none',
  TwoValid: 'button link',
  DocChapter: 'doc-chapter',
  GraphicsDoc: 'graphics-document',
  Padded: ' button ',
  Empty: '',
  Abstract: 'widget',
  Foo: 'foo',
  Typo: 'buton',
  Mixed: 'button foo',
};
const ELEM = {
  Div: (a) => el('div', [a], 'x'),
  Component: (a) => el('Box', [a], 'x'),
  Member: (a) => el('Ui.Box', [a], 'x'),
};
const OPT = {
  Default: undefined,
  AllowFoo: { allowedInvalidRoles: ['foo'] },
  IgnoreNonDOM: { ignoreNonDOM: true },
};

module.exports = {
  rule: 'aria-role',
  // (13 values x 4 static spellings + Dynamic) x 3 elems x 3 options
  domain: 53 * 3 * 3,
  traces: 4200,
  filename: FILE,
  key: (s) =>
    ['value', 'spelling', 'elem', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) =>
    program(
      ELEM[tag(s.elem)](attr('role', VAL[tag(s.value)], tag(s.spelling))),
      {
        pre: ["import { Box, Ui } from './ui';"],
      },
    ),
};
