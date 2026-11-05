const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const TEXT = {
  ClickHere: 'click here',
  ClickHereCaps: 'Click Here',
  ClickHerePunct: 'Click here.',
  Here: 'here',
  LearnMore: 'Learn more',
  ALink: 'a link',
  Link: 'link',
  More: 'More',
  Descriptive: 'Read the pricing guide',
  Containing: 'Click here to read the pricing guide',
};
const SPELL = {
  Child: (t) => t,
  Braced: (t) => `{"${t}"}`,
  Template: (t) => `{\`${t}\`}`,
};
const ELEM = { A: 'a', Component: 'Link', Member: 'Ui.Link' };

module.exports = {
  rule: 'anchor-ambiguous-text',
  // Texts 14 x 2 opts; Spellings 2 x 3; Elems 2 x 3.
  domain: 28 + 6 + 6,
  traces: 900,
  filename: FILE,
  key: (s) =>
    ['focus', 'text', 'spelling', 'elem', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => (tag(s.opt) === 'Words' ? { words: ['more'] } : undefined),
  code: (s) => {
    const t = tag(s.text);
    const attrs = ['href="/pricing"'];
    let children;
    if (t === 'Nested') children = '<span>click here</span>';
    else if (t === 'Expr') children = '{value}';
    else if (t === 'Mixed') children = 'click here {value}';
    else if (t === 'AriaLabelled') {
      attrs.push('aria-label="Pricing guide"');
      children = 'click here';
    } else children = SPELL[tag(s.spelling)](TEXT[t]);
    return program(el(ELEM[tag(s.elem)], attrs, children), {
      pre: ["import { Link, Ui } from './ui';"],
    });
  },
};
