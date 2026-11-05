const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const LANG = {
  Absent: () => null,
  Empty: (sp) => attr('lang', '', sp),
  Undef: () => 'lang={undefined}',
  Value: (sp) => attr('lang', 'en', sp),
  Dyn: () => 'lang={value}',
};

module.exports = {
  rule: 'html-has-lang',
  // Empty, Value x 4 spellings; Absent, Undef, Dyn x 1; times 2 elements.
  domain: (4 + 4 + 3) * 2,
  traces: 400,
  filename: FILE,
  key: (s) =>
    ['lang', 'spelling', 'elem'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(
      el(
        tag(s.elem) === 'Html' ? 'html' : 'Html',
        [LANG[tag(s.lang)](tag(s.spelling))],
        '<body>x</body>',
      ),
      { pre: ["import { Html } from './ui';"] },
    ),
};
