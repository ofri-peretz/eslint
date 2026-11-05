const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ROLE = {
  Article: 'article',
  Heading: 'heading',
  Img: 'img',
  Listitem: 'listitem',
  Presentation: 'presentation',
  NoneRole: 'none',
  Tooltip: 'tooltip',
  BtnRole: 'button',
  LinkRole: 'link',
};
const ELEM = {
  Button: (r) =>
    el('button', ['type="button"', 'onClick={handler}', r], 'Save'),
  AHref: (r) => el('a', ['href="/x"', r], 'Home'),
  InputText: (r) => el('input', ['type="text"', 'aria-label="Name"', r]),
  Select: (r) => el('select', ['aria-label="Size"', r], '<option>S</option>'),
  Textarea: (r) => el('textarea', ['aria-label="Bio"', r]),
  Div: (r) => el('div', [r], 'x'),
  ABare: (r) => el('a', [r], 'x'),
  Component: (r) => el('Button', [r], 'Save'),
  Tr: (r) => `<table><tbody>${el('tr', [r], '<td>x</td>')}</tbody></table>`,
};
const OPT = { Default: undefined, Custom: { button: ['presentation'] } };

module.exports = {
  rule: 'no-interactive-element-to-noninteractive-role',
  // 8 elems x 9 roles x 3 spellings x 2 opts + Tr x 2 roles x 3 spellings
  domain: 8 * 9 * 3 * 2 + 6,
  traces: 3500,
  filename: FILE,
  key: (s) =>
    ['elem', 'role', 'spelling', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) =>
    program(
      ELEM[tag(s.elem)](attr('role', ROLE[tag(s.role)], tag(s.spelling))),
      {
        pre: ["import { Button } from './ui';"],
      },
    ),
};
