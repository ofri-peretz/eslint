const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// [as JSX text, as an attribute value]
const CHAR = {
  Quote: ['Use "quotes" here', `title='Use "quotes" here'`],
  EscQuot: [
    'Use &quot;quotes&quot; here',
    'title="Use &quot;quotes&quot; here"',
  ],
  NumQuot: ['Use &#34;quotes&#34; here', 'title="Use &#34;quotes&#34; here"'],
  BracedQuote: [`Use {'"'}quotes{'"'} here`, `title={'Use "quotes" here'}`],
  EscGt: ['5 &gt; 3', 'title="5 &gt; 3"'],
  Plain: ['Hello world', 'title="Hello world"'],
};

module.exports = {
  rule: 'no-unescaped-entities',
  domain: 6 * 2,
  traces: 200,
  filename: FILE,
  key: keyOf('char', 'place'),
  code: (s) => {
    const [text, attr] = CHAR[tag(s.char)];
    const jsx =
      tag(s.place) === 'InText' ? `<p>${text}</p>` : `<p ${attr}>Hello</p>`;
    return src('export function App() {', `  return ${jsx};`, '}');
  },
};
