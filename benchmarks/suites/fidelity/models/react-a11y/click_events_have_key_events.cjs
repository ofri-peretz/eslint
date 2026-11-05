const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Div: ['div', []],
  Span: ['span', []],
  Li: ['li', []],
  AnchorNoHref: ['a', []],
  RoleButton: ['div', ['role="button"', 'tabIndex={0}']],
  RoleLink: ['span', ['role="link"', 'tabIndex={0}']],
  Button: ['button', []],
  AnchorHref: ['a', ['href="/home"']],
  Input: ['input', ['type="text"']],
  Select: ['select', []],
  Textarea: ['textarea', []],
  Component: ['Box', []],
  Member: ['Ui.Box', []],
};
const KEY = {
  NoKey: [],
  KeyDown: ['onKeyDown={handler}'],
  KeyUp: ['onKeyUp={handler}'],
  KeyPress: ['onKeyPress={handler}'],
  Spread: ['{...rest}'],
};
const HIDDEN = {
  Shown: [],
  AriaHiddenTrue: ['aria-hidden="true"'],
  AriaHiddenBraced: ['aria-hidden={true}'],
  AriaHiddenFalse: ['aria-hidden="false"'],
  RolePresentation: ['role="presentation"'],
  RoleNone: ['role="none"'],
};
const SELF_CLOSING = new Set(['input']);

module.exports = {
  rule: 'click-events-have-key-events',
  // Elems 11 x 2 keys; Keys 4 x 2 clicks; Hiddens 2 elems x 2 keys x 2.
  domain: 22 + 8 + 8,
  traces: 600,
  filename: FILE,
  key: (s) =>
    ['focus', 'elem', 'key', 'hidden', 'click']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  code: (s) => {
    const [t, base] = ELEM[tag(s.elem)];
    const attrs = [
      ...base,
      s.click ? 'onClick={handler}' : '',
      ...KEY[tag(s.key)],
      ...HIDDEN[tag(s.hidden)],
    ];
    return program(el(t, attrs, SELF_CLOSING.has(t) ? '' : 'x'), {
      pre: ["import { Box, Ui } from './ui';"],
    });
  },
};
