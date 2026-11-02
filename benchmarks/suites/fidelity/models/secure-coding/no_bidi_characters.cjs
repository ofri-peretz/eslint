const { tag } = require('../../lib.cjs');

const CH = {
  Rlo: String.fromCodePoint(0x202e),
  Lre: String.fromCodePoint(0x202a),
  Lri: String.fromCodePoint(0x2066),
  Pdi: String.fromCodePoint(0x2069),
  Lrm: String.fromCodePoint(0x200e),
  Rlm: String.fromCodePoint(0x200f),
  HebrewText: 'שלום',
  Zwsp: String.fromCodePoint(0x200b),
};

module.exports = {
  domain: 72,
  traces: 600,
  rule: 'no-bidi-characters',
  key: (s) => `${tag(s.ch)}|${tag(s.where)}|${tag(s.opts)}`,
  config: (s) => ({
    allowDirectionalMarks: tag(s.opts) === 'AllowMarks',
    additionalCharacters: tag(s.opts) === 'AddZwsp' ? ['U+200B'] : [],
  }),
  code: (s) => {
    const c = CH[tag(s.ch)];
    return {
      InString: `export const level = 'user${c}admin';\n`,
      InComment: `// check if user${c}admin\nexport const level = 1;\n`,
      InTemplate: `export const level = \`user${c}admin\`;\n`,
    }[tag(s.where)];
  },
};
