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
const HOVER = {
  NoHover: [],
  Over: ['onMouseOver={handler}'],
  Enter: ['onMouseEnter={handler}'],
  Out: ['onMouseOut={handler}'],
  Leave: ['onMouseLeave={handler}'],
};
const PAIR = {
  NoPair: [],
  OnFocus: ['onFocus={handler}'],
  OnBlur: ['onBlur={handler}'],
  Both: ['onFocus={handler}', 'onBlur={handler}'],
  Spread: ['{...rest}'],
};

module.exports = {
  rule: 'mouse-events-have-key-events',
  domain: 4 * 5 * 4,
  traces: 800,
  filename: FILE,
  key: (s) =>
    ['elem', 'hover', 'pair'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const [t, base] = ELEM[tag(s.elem)];
    return program(
      el(t, [...base, ...HOVER[tag(s.hover)], ...PAIR[tag(s.pair)]], 'x'),
      {
        pre: ["import { Box, Ui } from './ui';"],
      },
    );
  },
};
