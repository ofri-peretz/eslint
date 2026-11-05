const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const KEY = {
  Quoted: "'data-testid'",
  Computed: "['data-testid']",
  Template: '[`data-testid`]',
  OtherKey: "'data-slot'",
  Camel: 'dataTestId',
};
const DEFAULT = {
  Str: " = 'card'",
  Tmpl: ' = `card`',
  Ident: ' = FALLBACK_ID',
  Undef: ' = undefined',
  NoDefault: '',
};

module.exports = {
  rule: 'no-default-test-id',
  domain: 5 * 5 * 2,
  traces: 400,
  filename: FILE,
  key: keyOf('key', 'dflt', 'site'),
  code: (s) => {
    const pattern = `{ ${KEY[tag(s.key)]}: testId${DEFAULT[tag(s.dflt)]}, ...rest }`;
    const param = tag(s.site) === 'Param';
    return src(
      "const FALLBACK_ID = 'card';",
      `export function Card(${param ? `${pattern}: any` : 'props: any'}) {`,
      param ? '' : `  const ${pattern} = props;`,
      '  return <div data-testid={testId} {...rest} />;',
      '}',
    );
  },
};
