const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const TAB = {
  NoTab: '',
  Zero: 'tabIndex={0}',
  Neg: 'tabIndex={-1}',
  DynTab: 'tabIndex={value}',
};
const AD = {
  AdLit: 'aria-activedescendant="opt-1"',
  AdDynamic: 'aria-activedescendant={value}',
  AdAbsent: '',
};
const ELEM = {
  Div: (a) => el('div', a, 'x'),
  Span: (a) => el('span', a, 'x'),
  Ul: (a) => el('ul', a, '<li id="opt-1">One</li>'),
  Input: (a) => el('input', a),
  Button: (a) => el('button', a, 'x'),
  Select: (a) => el('select', a, '<option>One</option>'),
  Textarea: (a) => el('textarea', a),
  AnchorHref: (a) => el('a', ['href="/x"', ...a], 'x'),
  AnchorBare: (a) => el('a', a, 'x'),
};

module.exports = {
  rule: 'aria-activedescendant-has-tabindex',
  // 9 elems x (3 tabIndex x 2 spread + NoTab) x 3 ad
  domain: 9 * 7 * 3,
  traces: 1500,
  filename: FILE,
  key: (s) =>
    ['elem', 'tab', 'spread', 'ad'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(
      ELEM[tag(s.elem)]([
        AD[tag(s.ad)],
        TAB[tag(s.tab)],
        s.spread ? '{...rest}' : '',
      ]),
    ),
};
