const { tag } = require('../../lib.cjs');
const { FILE, program } = require('../../jsx.cjs');

const ELEM = { A: 'a', Link: 'Link', MemberLink: 'Ui.Link' };
// [attributes, children]; children null means self-closing.
const CONTENT = {
  Text: ['', 'Pricing'],
  Expr: ['', '{value}'],
  ElemChild: ['', '<span>Pricing</span>'],
  CompChild: ['', '<Trans id="pricing" />'],
  HiddenChild: ['', '<span aria-hidden="true">Pricing</span>'],
  SelfClosing: ['', null],
  EmptyPair: ['', ''],
  Space: ['', ' '],
  Undef: ['', '{undefined}'],
  InnerHtml: [' dangerouslySetInnerHTML={{ __html: value }}', null],
  ChildrenProp: [' children={value}', null],
};
const NAME = {
  NoName: '',
  AriaLabel: ' aria-label="Pricing"',
  AriaLabelledby: ' aria-labelledby="pricing-title"',
  Title: ' title="Pricing"',
};

module.exports = {
  rule: 'anchor-has-content',
  // Contents: 11 x 3 elems x 2 opts; Names: 3 x 3 x 2.
  domain: 11 * 6 + 3 * 6,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['focus', 'content', 'name', 'elem', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) =>
    tag(s.opt) === 'Named' ? { components: ['Link'] } : undefined,
  code: (s) => {
    const e = ELEM[tag(s.elem)];
    const [a, c] = CONTENT[tag(s.content)];
    const attrs = ` href="/pricing"${a}${NAME[tag(s.name)]}`;
    const jsx = c === null ? `<${e}${attrs} />` : `<${e}${attrs}>${c}</${e}>`;
    return program(jsx, { pre: ["import { Link, Trans, Ui } from './ui';"] });
  },
};
