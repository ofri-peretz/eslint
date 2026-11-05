const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const HREF = {
  External: '"https://example.com"',
  ExternalUpper: '"HTTPS://example.com"',
  ProtocolRelative: '"//cdn.example.com/x"',
  Local: '"/home"',
  BracedExternal: '{"https://example.com"}',
  BracedLocal: '{"/home"}',
};
const REL = {
  NoRel: '',
  Noopener: ' rel="noopener"',
  Noreferrer: ' rel="noreferrer"',
  Both: ' rel="noopener noreferrer"',
  OtherRel: ' rel="nofollow"',
  BracedNoopener: ' rel={"noopener"}',
  UpperNoopener: ' rel="NoOpener"',
};
const TARGET = {
  Blank: '"_blank"',
  BlankBraced: '{"_blank"}',
  BlankUpper: '"_BLANK"',
  Self: '"_self"',
};

module.exports = {
  rule: 'jsx-no-target-blank',
  // Values: 6 hrefs x 7 rels x 4 targets; Opts: 2 elems x 2 x 2 x 2 x 2 rels;
  // Dynamic: 3.
  domain: 168 + 32 + 3,
  traces: 3000,
  filename: FILE,
  key: keyOf(
    'focus',
    'href',
    'rel',
    'target',
    'elem',
    'links',
    'forms',
    'allowReferrer',
    'dyn',
  ),
  config: (s) => {
    const f = tag(s.focus);
    if (f === 'Dynamic') {
      return tag(s.dyn) === 'SpreadDefault'
        ? undefined
        : { enforceDynamicLinks: 'never' };
    }
    if (f !== 'Opts') return undefined;
    const c = {};
    if (tag(s.links) === 'Off') c.links = false;
    if (tag(s.forms) === 'On') c.forms = true;
    if (tag(s.allowReferrer) === 'On') c.allowReferrer = true;
    return Object.keys(c).length ? c : undefined;
  },
  code: (s) => {
    const f = tag(s.focus);
    if (f === 'Dynamic') {
      const d = tag(s.dyn);
      const attrs =
        d === 'DynHref'
          ? 'target="_blank" href={value}'
          : d === 'DynTarget'
            ? 'target={value} href="https://example.com"'
            : 'target="_blank" href="https://example.com" {...rest}';
      return program(`<a ${attrs}>x</a>`);
    }
    if (f === 'Opts' && tag(s.elem) === 'Form') {
      return program(
        `<form target="_blank" action="https://example.com"${REL[tag(s.rel)]} />`,
      );
    }
    return program(
      `<a target=${TARGET[tag(s.target)]} href=${HREF[tag(s.href)]}${REL[tag(s.rel)]}>x</a>`,
    );
  },
};
