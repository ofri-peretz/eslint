const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const H = 'onClick={handler} tabIndex={0}';
// [wrap(inner), tag, children, role]
const td = (x) => `<table><tbody><tr>${x}</tr></tbody></table>`;
const ul = (x) => `<ul>${x}</ul>`;
const id = (x) => x;
const PAIR = {
  H2Button: [id, 'h2', 'Title', 'button'],
  PLink: [id, 'p', 'Text', 'link'],
  ArticleButton: [id, 'article', 'x', 'button'],
  ImgButton: [id, 'img', '', 'button', ['src="/a.png"', 'alt="Open"']],
  LiButton: [ul, 'li', 'x', 'button'],
  LiCheckbox: [ul, 'li', 'x', 'checkbox', ['aria-checked="false"']],
  UlButton: [id, 'ul', '<li>x</li>', 'button'],
  TdButton: [td, 'td', 'x', 'button'],
  H2Tab: [id, 'h2', 'x', 'tab'],
  PCheckbox: [id, 'p', 'x', 'checkbox', ['aria-checked="false"']],
  UlListbox: [
    id,
    'ul',
    '<li role="option" aria-selected="false">x</li>',
    'listbox',
  ],
  UlMenu: [id, 'ul', '<li role="menuitem">x</li>', 'menu'],
  OlTablist: [id, 'ol', '<li role="tab">x</li>', 'tablist'],
  LiMenuitem: [ul, 'li', 'x', 'menuitem'],
  LiOption: [ul, 'li', 'x', 'option', ['aria-selected="false"']],
  LiTab: [ul, 'li', 'x', 'tab'],
  TableGrid: [id, 'table', '<tbody><tr><td>x</td></tr></tbody>', 'grid'],
  TdGridcell: [td, 'td', 'x', 'gridcell'],
  DivButton: [id, 'div', 'x', 'button'],
  SpanLink: [id, 'span', 'x', 'link'],
  CompButton: [id, 'Heading', 'x', 'button'],
  MemberButton: [id, 'Ui.Heading', 'x', 'button'],
  H2Region: [id, 'h2', 'x', 'region', ['aria-label="Area"']],
};
const OPT = { Default: undefined, Custom: { h2: ['button'] } };

module.exports = {
  rule: 'no-noninteractive-element-to-interactive-role',
  // (15 non-exempt pairs x 2 opts + 8 default-exempt pairs) x 3 spellings
  domain: (15 * 2 + 8) * 3,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['pair', 'spelling', 'opt'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const [wrap, t, kids, role, extra = []] = PAIR[tag(s.pair)];
    return program(
      wrap(el(t, [attr('role', role, tag(s.spelling)), H, ...extra], kids)),
      {
        pre: ["import { Heading, Ui } from './ui';"],
      },
    );
  },
};
