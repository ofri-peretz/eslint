const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const TARGET = {
  Sibling: 'https://eslint.interlace.tools/docs',
  Apex: 'https://ofriperetz.dev/articles',
  External: 'https://github.com/ofri-peretz/eslint',
  Relative: '/docs',
  Anchor: '#section',
};

const SPELLING = {
  AttrString: (u) => `<a href="${u}">docs</a>`,
  ExprString: (u) => `<a href={'${u}'}>docs</a>`,
  ExprTemplate: (u) => `<a href={\`${u}\`}>docs</a>`,
  Wrapped: (u) => `<a href={buildUtmHref('${u}')}>docs</a>`,
  OtherAttr: (u) => `<a title="${u}">docs</a>`,
};

module.exports = {
  rule: 'no-raw-cross-property-href',
  domain: 5 * 5,
  traces: 300,
  key: keyOf('spelling', 'target'),
  filename: 'src/app.tsx',
  code: (s) =>
    src(
      "import { buildUtmHref } from './lib/utm';",
      'export function Nav() {',
      `  return ${SPELLING[tag(s.spelling)](TARGET[tag(s.target)])};`,
      '}',
    ),
};
