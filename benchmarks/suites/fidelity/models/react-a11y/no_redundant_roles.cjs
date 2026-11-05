const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

// [tag, other attrs, children, role]
const PAIR = {
  MainMain: ['main', [], 'x', 'main'],
  ArticleArticle: ['article', [], 'x', 'article'],
  NavNavigation: ['nav', [], 'x', 'navigation'],
  ButtonButton: ['button', ['type="button"'], 'x', 'button'],
  UlList: ['ul', [], '<li>x</li>', 'list'],
  OlList: ['ol', [], '<li>x</li>', 'list'],
  LiListitem: ['li', [], 'x', 'listitem'],
  H1Heading: ['h1', [], 'Title', 'heading'],
  AHrefLink: ['a', ['href="/x"'], 'x', 'link'],
  TableTable: ['table', [], '<tbody><tr><td>x</td></tr></tbody>', 'table'],
  AsideComplementary: ['aside', [], 'x', 'complementary'],
  CheckboxCheckbox: ['input', ['type="checkbox"'], '', 'checkbox'],
  TextareaTextbox: ['textarea', [], '', 'textbox'],
  DialogDialog: ['dialog', ['open'], 'x', 'dialog'],
  HrSeparator: ['hr', [], '', 'separator'],
  ImgImg: ['img', ['src="/a.png"', 'alt="A cat"'], '', 'img'],
  ABareLink: ['a', ['tabIndex={0}'], 'x', 'link'],
  DivButton: ['div', ['tabIndex={0}'], 'x', 'button'],
  UlMenu: ['ul', [], '<li role="menuitem">x</li>', 'menu'],
  H1Button: ['h1', [], 'x', 'button'],
  ButtonLink: ['button', ['type="button"'], 'x', 'link'],
  LiOption: ['li', ['aria-selected="false"'], 'x', 'option'],
  CompMain: ['Main', [], 'x', 'main'],
  MemberMain: ['Ui.Main', [], 'x', 'main'],
};
const OPT = { Default: undefined, Custom: { nav: [], main: ['main'] } };

module.exports = {
  rule: 'no-redundant-roles',
  // 24 pairs x 3 spellings x 2 options, less the 4 default-only pairs' Custom
  domain: 24 * 3 * 2 - 4 * 3,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['pair', 'spelling', 'opt'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const [t, attrs, kids, role] = PAIR[tag(s.pair)];
    return program(
      el(t, [...attrs, attr('role', role, tag(s.spelling))], kids),
      {
        pre: ["import { Main, Ui } from './ui';"],
      },
    );
  },
};
