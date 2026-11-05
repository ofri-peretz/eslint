const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Div: ['div', []],
  Span: ['span', []],
  AnchorNoHref: ['a', []],
  AnchorHref: ['a', ['href="/home"']],
  Button: ['button', ['type="button"']],
  Li: ['li', []],
  DivRoleButton: ['div', ['role="button"', 'tabIndex={0}']],
  DivRoleArticle: ['div', ['role="article"']],
  DivRoleDynamic: ['div', ['role={value}']],
  Component: ['Box', []],
  Member: ['Ui.Box', []],
};
const HANDLER = {
  NoHandler: [],
  Click: ['onClick={handler}'],
  MouseDown: ['onMouseDown={handler}'],
  MouseUp: ['onMouseUp={handler}'],
  KeyDown: ['onKeyDown={handler}'],
  KeyUp: ['onKeyUp={handler}'],
  KeyPress: ['onKeyPress={handler}'],
  Load: ['onLoad={handler}'],
  OnFocus: ['onFocus={handler}'],
};
const EXTRA = {
  Plain: [],
  AriaHidden: ['aria-hidden="true"'],
  RolePresentation: ['role="presentation"'],
  Spread: ['{...rest}'],
};

module.exports = {
  rule: 'no-static-element-interactions',
  // Elems 10; Handlers 9 x 2 opts; Extras 1.
  domain: 10 + 18 + 1,
  traces: 600,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'handler', 'opt', 'extra']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'OnlyMouseDown' ? { handlers: ['onMouseDown'] } : undefined,
  code: (s) => {
    const [t, base] = ELEM[tag(s.elem)];
    const attrs = [...base, ...HANDLER[tag(s.handler)], ...EXTRA[tag(s.extra)]];
    return program(el(t, attrs, 'x'), {
      pre: ["import { Box, Ui } from './ui';"],
    });
  },
};
