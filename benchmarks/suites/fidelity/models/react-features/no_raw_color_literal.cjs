const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, program } = require('../../jsx.cjs');

const COLOR = {
  Hex6: '#ff0000',
  Hex3: '#fff',
  Rgb: 'rgb(255, 0, 0)',
  Hsl: 'hsl(0 100% 50%)',
  Oklch: 'oklch(0.6 0.2 30)',
  Var: 'var(--snp-brand)',
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

function jsxFor(surface, c, call) {
  switch (surface) {
    case 'AttrLit':
      return `<svg><path fill="${c}" /></svg>`;
    case 'AttrBraced':
      return `<svg><path fill={"${c}"} /></svg>`;
    case 'AttrTmpl':
      return `<svg><path fill={\`${c}\`} /></svg>`;
    case 'AttrCond':
      return `<svg><path fill={flag ? "${c}" : "${c}"} /></svg>`;
    case 'ClassArb':
      return `<div className="bg-[${c}] p-4" />`;
    case 'StyleStr':
      return `<div style={{ color: "${c}" }} />`;
    case 'StyleTmpl':
      return `<div style={{ color: \`${c}\` }} />`;
    case 'BuilderLit':
      return `<div className={${call}("p-4", "bg-[${c}]")} />`;
    case 'BuilderCond':
      return `<div className={${call}("p-4", flag && "bg-[${c}]")} />`;
    default:
      return `<div className={${call}(\`bg-[${c}]\`)} />`;
  }
}

module.exports = {
  rule: 'no-raw-color-literal',
  // Values: 10 surfaces x 6 colours; Builders: 6 x 2; Prose: 2.
  domain: 60 + 12 + 2,
  traces: 1000,
  filename: FILE,
  key: keyOf('focus', 'surface', 'color', 'builder', 'prose'),
  code: (s) => {
    const [imp, call] = BUILDER[tag(s.builder)];
    const p = tag(s.prose);
    if (p === 'IssueTitle')
      return program('<span title="Issue #123">Fixed</span>');
    if (p === 'FragmentHref') return program('<a href="#add">Add</a>');
    return program(jsxFor(tag(s.surface), COLOR[tag(s.color)], call), {
      pre: [imp],
    });
  },
};
