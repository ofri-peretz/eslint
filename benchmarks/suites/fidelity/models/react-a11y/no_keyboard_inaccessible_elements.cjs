const { tag, withTestFile } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Div: 'div',
  Span: 'span',
  Section: 'section',
  Button: 'button',
  Component: 'Box',
  Member: 'Ui.Box',
};
const TAB = {
  NoTab: [],
  Zero: ['tabIndex={0}'],
  MinusOne: ['tabIndex={-1}'],
  TabDynamic: ['tabIndex={value}'],
};
const KEY = {
  NoKey: [],
  KeyDown: ['onKeyDown={handler}'],
  KeyUp: ['onKeyUp={handler}'],
};
const EXTRA = {
  Plain: [],
  NoClick: [],
  AriaHidden: ['aria-hidden="true"'],
  RolePresentation: ['role="presentation"'],
  Spread: ['{...rest}'],
  RoleButton: ['role="button"'],
};

const base = {
  rule: 'no-keyboard-inaccessible-elements',
  // Elems 6 x 2 opts; Support 1 x 3 + 3 x 2; Extras 4.
  domain: 12 + 9 + 4,
  traces: 400,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'opt', 'tab', 'key', 'extra']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'CheckSection' ? { checkElements: ['section'] } : undefined,
  code: (s) => {
    const extra = tag(s.extra);
    const attrs = [
      extra === 'NoClick' ? '' : 'onClick={handler}',
      ...TAB[tag(s.tab)],
      ...KEY[tag(s.key)],
      ...EXTRA[extra],
    ];
    return program(el(ELEM[tag(s.elem)], attrs, 'x'), {
      pre: ["import { Box, Ui } from './ui';"],
    });
  },
};

module.exports = withTestFile(base, {
  option: 'ignoreInTests',
  flip: false,
  testFile: 'src/App.test.tsx',
});
