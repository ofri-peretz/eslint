const { tag } = require('../../lib.cjs');
const { FILE, program, attr, el } = require('../../jsx.cjs');

const HREF = {
  Hash: '#',
  Js: 'javascript:void(0)',
  Empty: '',
  Fragment: '#pricing',
  Path: '/pricing',
};
const OPT = {
  Default: undefined,
  OnlyNoHref: { aspects: ['noHref'] },
  OnlyInvalid: { aspects: ['invalidHref'] },
  OnlyPreferButton: { aspects: ['preferButton'] },
  Components: { components: ['Link'] },
  SpecialLink: { components: ['Link'], specialLink: ['to'] },
};

module.exports = {
  rule: 'anchor-is-valid',
  // Spellings 5 x 4; Aspects 13 href/handler pairs x 4 opts; Comps 13 x 3.
  domain: 20 + 13 * 4 + 13 * 3,
  traces: 1500,
  filename: FILE,
  key: (s) =>
    ['focus', 'href', 'spelling', 'handler', 'elem', 'opt']
      .map((k) => `${k}=${tag(s[k])}`)
      .join(' '),
  config: (s) => OPT[tag(s.opt)],
  code: (s) => {
    const e = tag(s.elem);
    const name = e === 'LinkTo' ? 'to' : 'href';
    const h = tag(s.href);
    const hrefAttr =
      h === 'NoHref'
        ? null
        : h === 'Dyn'
          ? `${name}={value}`
          : attr(name, HREF[h], tag(s.spelling));
    return program(
      el(
        e === 'A' ? 'a' : 'Link',
        [hrefAttr, s.handler ? 'onClick={handler}' : null],
        'Pricing',
      ),
      { pre: ["import { Link } from './ui';"] },
    );
  },
};
