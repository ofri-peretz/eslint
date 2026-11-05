const { tag } = require('../../lib.cjs');
const { FILE, program, el } = require('../../jsx.cjs');

const TAB = {
  ZeroLit: 'tabIndex="0"',
  ZeroBraced: 'tabIndex={0}',
  Neg: 'tabIndex={-1}',
  Dyn: 'tabIndex={value}',
};
const CTX = {
  H2: (t) => el('h2', [t], 'Title'),
  P: (t) => el('p', [t], 'Text'),
  Li: (t) => `<ul>${el('li', [t], 'x')}</ul>`,
  Article: (t) => el('article', [t], 'x'),
  Img: (t) => el('img', ['src="/a.png"', 'alt="A cat"', t]),
  DivArticleRole: (t) => el('div', ['role="article"', t], 'x'),
  Button: (t) => el('button', ['type="button"', t], 'x'),
  AHref: (t) => el('a', ['href="/x"', t], 'x'),
  Input: (t) => el('input', ['aria-label="Name"', t]),
  DivButtonRole: (t) =>
    el('div', ['role="button"', 'onClick={handler}', t], 'x'),
  DivTabpanel: (t) => el('div', ['role="tabpanel"', t], 'x'),
  H2DynRole: (t) => el('h2', ['role={value}', t], 'x'),
};
const OPT = {
  Default: undefined,
  Tags: { tags: ['h2'] },
  Roles: { roles: ['article'] },
  NoExpr: { allowExpressionValues: false },
};

module.exports = {
  rule: 'no-noninteractive-tabindex',
  // 12 ctxs x 4 tabIndex x 4 options, less DivTabpanel x Roles
  domain: 12 * 4 * 4 - 4,
  traces: 1600,
  filename: FILE,
  key: (s) => ['ctx', 'tab', 'opt'].map((k) => `${k}=${tag(s[k])}`).join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => program(CTX[tag(s.ctx)](TAB[tag(s.tab)])),
};
