const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const JSX = {
  BareEmoji: '<span>🐼</span>',
  LabelledEmoji: '<span role="img" aria-label="panda">🐼</span>',
  NoEmoji: '<span>panda</span>',
};

module.exports = {
  rule: 'accessible-emoji',
  domain: 3,
  traces: 300,
  filename: FILE,
  key: keyOf('shape'),
  code: (s) => program(JSX[tag(s.shape)]),
};
