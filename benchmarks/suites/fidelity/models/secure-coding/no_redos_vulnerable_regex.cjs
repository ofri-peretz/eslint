const { tag } = require('../../lib.cjs');

// Regex source text, as it appears between the slashes of a literal.
const SRC = {
  NestedPlus: '^(a+)+$',
  NestedClassStar: '^([a-zA-Z]+)*$',
  OverlapAlt: '^(a|a)+$',
  DotStarStar: '^(.*)*$',
  Quadratic: '^a*a*$',
  Simple: 'a+',
  ClassPlus: '[a-zA-Z]+$',
  Atomic: '(?=(a+))\\1',
  StripeUrl: '^https:\\/\\/js\\.stripe\\.com\\/v3\\/?(\\?.*)?$',
  Unparseable: '(a+',
};

module.exports = {
  domain: 29,
  traces: 300,
  rule: 'no-redos-vulnerable-regex',
  key: (s) => `${tag(s.pat)}|${tag(s.spelling)}`,
  config: () => ({}),
  code: (s) => {
    const src = SRC[tag(s.pat)];
    const expr = {
      Literal: `/${src}/`,
      NewCtor: `new RegExp(${JSON.stringify(src)})`,
      CallCtor: `RegExp(${JSON.stringify(src)})`,
    }[tag(s.spelling)];
    return `export const re = ${expr};\n`;
  },
};
