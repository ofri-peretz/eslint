const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const PII_KEY = {
  PiiIdent: 'email',
  PiiQuoted: "'email'",
  PiiComputed: "['email']",
  NoPii: 'note',
};

module.exports = {
  rule: 'require-data-minimization',
  domain: 2 * 2 * 3 * 4 * 2,
  traces: 1200,
  key: keyOf('piiConfigured', 'lowMax', 'count', 'pii', 'values'),
  config: (s) => {
    const o = {};
    if (s.piiConfigured) o.piiFields = ['email'];
    if (s.lowMax) o.maxProperties = 3;
    return Object.keys(o).length ? o : undefined;
  },
  code: (s) => {
    const max = s.lowMax ? 3 : 10;
    const n = tag(s.count) === 'OverMax' ? max + 1 : max;
    const runtime = tag(s.values) === 'Runtime';
    const props = [
      `${PII_KEY[tag(s.pii)]}: ${runtime ? 'body.email' : "'a@b.c'"}`,
    ];
    for (let i = 1; i < n; i++)
      props.push(`f${i}: ${runtime ? `body.f${i}` : i}`);
    if (tag(s.count) === 'AtMaxPlusSpread') props.push('...extra');
    return src(
      'export function collect(body: any, extra: object) {',
      `  return { ${props.join(', ')} };`,
      '}',
    );
  },
};
