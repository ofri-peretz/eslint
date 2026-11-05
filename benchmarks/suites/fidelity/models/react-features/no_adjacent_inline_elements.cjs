const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const BETWEEN = {
  Nothing: '',
  Space: ' ',
  Newline: '\n      ',
  Text: ' | ',
  BracedSpace: "{' '}",
  Dynamic: '{value}',
  Comment: '{/* gap */}',
};
const PAIR = {
  InlineInline: ['<em>Hello</em>', '<b>World</b>'],
  InlineBlock: ['<em>Hello</em>', '<div>World</div>'],
  CompInline: ['<Link to="/">Home</Link>', '<b>World</b>'],
};

module.exports = {
  rule: 'no-adjacent-inline-elements',
  domain: 7 * 3 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('between', 'pair', 'parent'),
  code: (s) => {
    const [a, b] = PAIR[tag(s.pair)];
    const [open, close] =
      tag(s.parent) === 'Element' ? ['<p>', '</p>'] : ['<>', '</>'];
    return src(
      "import { Link } from './router';",
      'export function App({ value }: any) {',
      `  return (\n    ${open}${a}${BETWEEN[tag(s.between)]}${b}${close}\n  );`,
      '}',
    );
  },
};
