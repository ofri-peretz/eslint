const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const VALUE = {
  Source: {
    Valid: 'devto',
    Invalid: 'dev_to',
    WrongCase: 'Github',
    EncodedValid: 'dev%74o',
  },
  Medium: {
    Valid: 'docs',
    Invalid: 'newsletter',
    WrongCase: 'Docs',
    EncodedValid: 'do%63s',
  },
};

const BASE = 'https://eslint.interlace.tools/';

const SITE = {
  Quoted: (k, v) => `'${BASE}?${k}=${v}'`,
  TemplateStatic: (k, v) => `\`${BASE}?${k}=${v}\``,
  TemplateTail: (k, v) => `\`${BASE}?${k}=${v}&utm_content=\${id}\``,
  TemplatePartial: (k, v) => `\`${BASE}?${k}=${v}\${id}\``,
};

module.exports = {
  rule: 'utm-taxonomy',
  domain: 4 * 2 * 4,
  traces: 400,
  key: keyOf('site', 'param', 'value'),
  code: (s) => {
    const p = tag(s.param);
    const k = p === 'Source' ? 'utm_source' : 'utm_medium';
    return src(
      'export function link(id: string) {',
      `  return ${SITE[tag(s.site)](k, VALUE[p][tag(s.value)])};`,
      '}',
    );
  },
};
