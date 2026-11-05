const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const ELEM = {
  Marquee: 'marquee',
  Blink: 'blink',
  Div: 'div',
  MarqueeComponent: 'Marquee',
  MemberMarquee: 'Ui.Marquee',
};

module.exports = {
  rule: 'no-distracting-elements',
  domain: 5 * 2 * 2,
  traces: 300,
  filename: FILE,
  key: (s) =>
    ['elem', 'opt', 'withProps'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) =>
    tag(s.opt) === 'MarqueeOnly' ? { elements: ['marquee'] } : undefined,
  code: (s) =>
    program(
      el(
        ELEM[tag(s.elem)],
        s.withProps ? ['className="news"', '{...rest}'] : [],
        'Breaking',
      ),
      { pre: ["import { Marquee, Ui } from './ui';"] },
    ),
};
