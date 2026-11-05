const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const KEY = {
  Ident: 'padding',
  Quoted: "'padding'",
  ComputedStatic: "['padding']",
  CssVar: "'--snp-pad'",
  ComputedDyn: '[value]',
};
const VAL = {
  Str: "'10px'",
  Num: '100',
  Neg: '-1',
  Tmpl: '`10px`',
  TmplExpr: '`${value}px`',
  Ident2: 'value',
  Cond: "flag ? '1px' : '2px'",
  Undef: 'undefined',
};

module.exports = {
  rule: 'no-inline-style',
  domain: 5 * 8 * 2,
  traces: 700,
  filename: FILE,
  key: keyOf('key', 'value', 'companion'),
  code: (s) => {
    const extra = tag(s.companion) === 'WithDynamic' ? ', left: value' : '';
    return program(
      `<div style={{ ${KEY[tag(s.key)]}: ${VAL[tag(s.value)]}${extra} }} />`,
    );
  },
};
