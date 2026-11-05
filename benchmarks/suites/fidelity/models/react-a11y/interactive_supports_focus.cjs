const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Div: ['div', []],
  Span: ['span', []],
  Button: ['button', ['type="button"']],
  AnchorHref: ['a', ['href="/home"']],
  Component: ['Box', []],
  Member: ['Ui.Box', []],
};
const ROLE = {
  NoRole: [],
  RoleButton: ['role="button"'],
  RoleLink: ['role="link"'],
  RoleCheckbox: ['role="checkbox"', 'aria-checked="false"'],
  RolePresentation: ['role="presentation"'],
  RoleArticle: ['role="article"'],
  RoleDynamic: ['role={value}'],
};
const HANDLER = {
  NoHandler: [],
  Click: ['onClick={handler}', 'onKeyDown={handler}'],
  KeyDown: ['onKeyDown={handler}'],
  MouseDown: ['onMouseDown={handler}'],
};
const TAB = {
  NoTab: [],
  Zero: ['tabIndex={0}'],
  MinusOne: ['tabIndex={-1}'],
  TabDynamic: ['tabIndex={value}'],
  Spread: ['{...rest}'],
};
const EXTRA = {
  Plain: [],
  AriaDisabled: ['aria-disabled="true"'],
  AriaHidden: ['aria-hidden="true"'],
};

module.exports = {
  rule: 'interactive-supports-focus',
  // Roles 6x2; Elems 6x2; Handlers 4; Tabs 2 roles x 4 x 2 opts; Extras 3.
  domain: 12 + 12 + 4 + 16 + 3,
  traces: 700,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'role', 'handler', 'tab', 'opt', 'extra']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'TabbableButton' ? { tabbable: ['button'] } : undefined,
  code: (s) => {
    const [t, base] = ELEM[tag(s.elem)];
    const attrs = [
      ...base,
      ...ROLE[tag(s.role)],
      ...HANDLER[tag(s.handler)],
      ...TAB[tag(s.tab)],
      ...EXTRA[tag(s.extra)],
    ];
    return program(el(t, attrs, 'x'), {
      pre: ["import { Box, Ui } from './ui';"],
    });
  },
};
