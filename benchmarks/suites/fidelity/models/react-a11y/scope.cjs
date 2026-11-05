const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ELEM = {
  Th: 'th',
  Td: 'td',
  Div: 'div',
  Tr: 'tr',
  Member: 'Ui.Cell',
};

module.exports = {
  rule: 'scope',
  domain: 5 * 3,
  traces: 300,
  filename: FILE,
  key: (s) => ['elem', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const e = ELEM[tag(s.elem)];
    const node = el(e, [attr('scope', 'col', tag(s.spelling))], 'Name');
    // Table cells parse anywhere in JSX; keep them in a table for realism.
    const wrapped =
      e === 'tr'
        ? `<table><thead>${node}</thead></table>`
        : e === 'th' || e === 'td'
          ? `<table><thead><tr>${node}</tr></thead></table>`
          : node;
    return program(wrapped, { pre: ["import { Ui } from './ui';"] });
  },
};
