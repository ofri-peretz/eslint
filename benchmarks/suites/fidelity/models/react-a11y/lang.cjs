const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const TAG = {
  En: 'en',
  EnUS: 'en-US',
  ZhHantTW: 'zh-Hant-TW',
  Fr: 'fr',
  Underscore: 'en_US',
  Word: 'english',
  OneLetter: 'e',
  Digits: '123',
};

module.exports = {
  rule: 'lang',
  // 8 static tags x 4 spellings + Dyn.
  domain: 8 * 4 + 1,
  traces: 900,
  filename: FILE,
  key: (s) => ['tg', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) => {
    const t = tag(s.tg);
    const a =
      t === 'Dyn' ? 'lang={value}' : attr('lang', TAG[t], tag(s.spelling));
    return program(el('html', [a], '<body>x</body>'));
  },
};
