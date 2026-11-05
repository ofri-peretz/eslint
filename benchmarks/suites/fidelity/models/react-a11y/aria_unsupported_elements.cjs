const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const ATTR = {
  Role: (sp) => attr('role', 'presentation', sp),
  AriaHidden: (sp) => attr('aria-hidden', 'true', sp),
  AriaLabel: (sp) => attr('aria-label', 'Label', sp),
  Data: (sp) => attr('data-id', 'x', sp),
  Spread: () => '{...rest}',
};
const ELEM = {
  Meta: (a) => el('meta', ['charSet="utf-8"', a]),
  Html: (a) => el('html', ['lang="en"', a], '<body>x</body>'),
  Script: (a) => el('script', ['src="/a.js"', a]),
  Style: (a) => el('style', [a], '{"a{}"}'),
  Track: (a) => el('track', ['kind="captions"', 'src="/c.vtt"', a]),
  Col: (a) => el('col', ['span={2}', a]),
  Source: (a) => el('source', ['src="/a.mp4"', a]),
  Link: (a) => el('link', ['rel="stylesheet"', 'href="/a.css"', a]),
  Title: (a) => el('title', [a], 'Home'),
  Picture: (a) => el('picture', [a], '<img src="/a.png" alt="A" />'),
  Div: (a) => el('div', [a], 'x'),
  Span: (a) => el('span', [a], 'x'),
  Input: (a) => el('input', [a]),
  Img: (a) => el('img', ['src="/a.png"', 'alt=""', a]),
  Component: (a) => el('Meta', [a]),
  Member: (a) => el('Head.Meta', [a]),
};

module.exports = {
  rule: 'aria-unsupported-elements',
  // 16 elems x (4 attrs x 2 spellings + Spread)
  domain: 16 * 9,
  traces: 1200,
  filename: FILE,
  key: (s) =>
    ['elem', 'at', 'spelling'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  code: (s) =>
    program(ELEM[tag(s.elem)](ATTR[tag(s.at)](tag(s.spelling))), {
      pre: ["import { Meta, Head } from './ui';"],
    }),
};
