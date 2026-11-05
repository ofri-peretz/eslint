const { tag } = require('../../lib.cjs');
const { FILE, program } = require('../../jsx.cjs');

const ELEM = {
  H1: 'h1',
  H4: 'h4',
  Heading: 'Heading',
  MemberHeading: 'Ui.Heading',
};
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

module.exports = {
  rule: 'heading-has-content',
  domain: 11 * 4 * 2,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['content', 'elem', 'opt'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) =>
    tag(s.opt) === 'Named' ? { components: ['Heading'] } : undefined,
  code: (s) => {
    const e = ELEM[tag(s.elem)];
    const [a, c] = CONTENT[tag(s.content)];
    const jsx = c === null ? `<${e}${a} />` : `<${e}${a}>${c}</${e}>`;
    return program(jsx, {
      pre: ["import { Heading, Trans, Ui } from './ui';"],
    });
  },
};
