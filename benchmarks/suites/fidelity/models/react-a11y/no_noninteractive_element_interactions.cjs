const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Li: ['li', []],
  P: ['p', []],
  H1: ['h1', []],
  Article: ['article', []],
  Img: ['img', ['src="/a.png"', 'alt="A chart"']],
  Ul: ['ul', []],
  Div: ['div', []],
  Button: ['button', ['type="button"']],
  DivRoleArticle: ['div', ['role="article"']],
  DivRoleListitem: ['div', ['role="listitem"']],
  DivRoleButton: ['div', ['role="button"', 'tabIndex={0}']],
  LiRoleButton: ['li', ['role="button"', 'tabIndex={0}']],
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
  ContentEditable: ['contentEditable="true"'],
  RoleDynamic: ['role={value}'],
};

module.exports = {
  rule: 'no-noninteractive-element-interactions',
  // Elems 14; Handlers 9 x 2 opts; Extras 4.
  domain: 14 + 18 + 4,
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
    return program(el(t, attrs, t === 'img' ? '' : 'x'), {
      pre: ["import { Box, Ui } from './ui';"],
    });
  },
};
