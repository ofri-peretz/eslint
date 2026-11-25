const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

// The tag as written, and the part an `ignore` entry would name.
const TAG = {
  Intrinsic: { jsx: '<div />', part: 'div' },
  Pascal: { jsx: '<MyComp />', part: 'MyComp' },
  OneLetter: { jsx: '<T />', part: 'T' },
  MixedUnderscore: { jsx: '<My_comp />', part: 'My_comp' },
  AllCaps: { jsx: '<MY_COMP />', part: 'MY_COMP' },
  LeadingUnderscore: { jsx: '<_MyComp />', part: '_MyComp' },
  MemberPascal: { jsx: '<Ui.Card />', part: 'Card' },
  MemberLower: { jsx: '<Ui.card />', part: 'card' },
};

module.exports = {
  rule: 'jsx-pascal-case',
  domain: 8 * 2 * 2 * 2 * 2,
  traces: 1500,
  filename: FILE,
  key: keyOf(
    'tagKind',
    'allowAllCaps',
    'allowLeadingUnderscore',
    'allowNamespace',
    'ignored',
  ),
  config: (s) => ({
    allowAllCaps: s.allowAllCaps,
    allowLeadingUnderscore: s.allowLeadingUnderscore,
    allowNamespace: s.allowNamespace,
    ignore: s.ignored ? [TAG[tag(s.tagKind)].part] : [],
  }),
  code: (s) =>
    program(TAG[tag(s.tagKind)].jsx, {
      pre: ['declare const Ui: any;', 'declare const _MyComp: any;'],
    }),
};
