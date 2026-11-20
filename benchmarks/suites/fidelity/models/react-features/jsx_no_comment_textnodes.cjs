const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const TEXT = {
  LineComment: '// note',
  BlockComment: '/* note */',
  SecondLine: 'hello\n// note',
  Url: 'see http://example.com',
  Words: 'hello world',
};

module.exports = {
  rule: 'jsx-no-comment-textnodes',
  domain: 4 * 5,
  traces: 600,
  filename: FILE,
  key: keyOf('place', 'text'),
  code: (s) => {
    const text = TEXT[tag(s.text)];
    switch (tag(s.place)) {
      case 'Child':
        return program(`<div>${text}</div>`);
      case 'FragmentChild':
        return program(`<>${text}</>`);
      case 'Braced':
        return program(`<div>{${JSON.stringify(text)}}</div>`);
      default:
        return program(`<div title="${text}" />`);
    }
  },
};
