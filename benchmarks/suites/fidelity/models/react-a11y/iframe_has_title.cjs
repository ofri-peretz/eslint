const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const TITLE = {
  Absent: () => null,
  Empty: (sp) => attr('title', '', sp),
  Undef: () => 'title={undefined}',
  Value: (sp) => attr('title', 'Product video', sp),
  Dyn: () => 'title={value}',
};
const ELEM = { Iframe: 'iframe', Component: 'Iframe', Member: 'Ui.Iframe' };

module.exports = {
  rule: 'iframe-has-title',
  // Empty, Value x 4 spellings; Absent, Undef, Dyn x 1; times 3 elements.
  domain: (4 + 4 + 3) * 3,
  traces: 500,
  filename: FILE,
  key: (s) =>
    ['title', 'spelling', 'elem'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(
      el(ELEM[tag(s.elem)], [
        'src="https://example.com/embed"',
        TITLE[tag(s.title)](tag(s.spelling)),
      ]),
      { pre: ["import { Iframe, Ui } from './ui';"] },
    ),
};
