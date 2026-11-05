const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const UTIL = {
  Px: 'px',
  Rounded: 'rounded',
  NegMx: '-mx',
  Gap: 'gap',
  SpaceX: 'space-x',
  Text: 'text',
  W: 'w',
};
const VALUE = {
  VPx: '18px',
  VRem: '1.5rem',
  VEm: '2em',
  VDotRem: '.5rem',
  VVar: 'var(--snp-space-md)',
  VCalc: 'calc(100%+36px)',
  VVh: '60vh',
};
const VARIANT = {
  NoVariant: '',
  Hover: 'hover:',
  Md: 'md:',
  Important: '!',
  DataState: 'data-[state=open]:',
};
// [import line, callee]
const BUILDER = {
  Cn: ["import { cn } from './utils';", 'cn'],
  ClsxNamed: ["import { clsx } from 'clsx';", 'clsx'],
  ClsxRenamed: ["import { clsx as cx } from 'clsx';", 'cx'],
  ClassnamesDefault: ["import classes from 'classnames';", 'classes'],
  TwMergeNamed: ["import { twMerge } from 'tailwind-merge';", 'twMerge'],
  OtherFn: ["import { format } from './utils';", 'format'],
};

function jsxFor(surface, cls, call) {
  switch (surface) {
    case 'Lit':
      return `<div className="flex ${cls}" />`;
    case 'Braced':
      return `<div className={"flex ${cls}"} />`;
    case 'Tmpl':
      return `<div className={\`flex ${cls}\`} />`;
    case 'TmplExpr':
      return `<div className={\`flex ${cls} \${value}\`} />`;
    case 'Cond':
      return `<div className={flag ? "flex ${cls}" : "flex"} />`;
    case 'BLit':
      return `<div className={${call}("flex", "${cls}")} />`;
    case 'BCond':
      return `<div className={${call}("flex", flag && "${cls}")} />`;
    case 'BObjKey':
      return `<div className={${call}("flex", { "${cls}": flag })} />`;
    default:
      return `<div className={${call}(["flex", "${cls}"])} />`;
  }
}

module.exports = {
  rule: 'no-arbitrary-token-class',
  // Spell: 9 surfaces x 2 values; Util: 7 x 7; Mods: 4; Builders: 6.
  domain: 18 + 49 + 4 + 6,
  traces: 1000,
  filename: FILE,
  key: keyOf('focus', 'surface', 'utility', 'value', 'modifier', 'builder'),
  code: (s) => {
    const [imp, call] = BUILDER[tag(s.builder)];
    const cls = `${VARIANT[tag(s.modifier)]}${UTIL[tag(s.utility)]}-[${VALUE[tag(s.value)]}]`;
    return program(jsxFor(tag(s.surface), cls, call), { pre: [imp] });
  },
};
