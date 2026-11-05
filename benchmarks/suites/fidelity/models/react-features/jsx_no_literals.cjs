const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const POSITION = {
  Text: '<p> Hello </p>',
  Braced: "<p>{'Hello'}</p>",
  Template: '<p>{`Hello`}</p>',
  Whitespace: '<p> </p>',
  Prop: '<p title="Hello" />',
  PropBraced: "<p title={'Hello'} />",
  Dynamic: '<p title={value}>{value}</p>',
};

module.exports = {
  rule: 'jsx-no-literals',
  domain: 7 * 2 * 2 * 2,
  traces: 800,
  filename: FILE,
  key: keyOf('position', 'allowed', 'noStrings', 'ignoreProps'),
  config: (s) => {
    const c = {};
    if (tag(s.allowed) === 'AllowedString') c.allowedStrings = ['Hello'];
    if (tag(s.noStrings) === 'NoStringsOff') c.noStrings = false;
    if (tag(s.ignoreProps) === 'IgnorePropsOff') c.ignoreProps = false;
    return Object.keys(c).length ? c : undefined;
  },
  code: (s) => program(POSITION[tag(s.position)]),
};
