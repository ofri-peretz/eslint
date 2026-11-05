const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SPEC = {
  NodeProto: 'node:path',
  BareFs: 'fs',
  Crypto: 'crypto',
  FsPromises: 'fs/promises',
  React: 'react',
  Zed: 'Zed',
  Internal: '@/lib',
  Parent: '../up',
  ParentBare: '..',
  Sibling: './sib',
  Index: './index',
  IndexJs: './index.js',
  IndexSlash: './',
};

function line(kind, binding) {
  if (kind === 'TypeExt') return `import type { ${binding} } from 'ext-types';`;
  if (kind === 'TypeSib') return `import type { ${binding} } from './types';`;
  if (kind === 'SideEffect') return `import './setup';`;
  return `import ${binding} from '${SPEC[kind]}';`;
}

const CONFIG = {
  Defaults: undefined,
  Desc: { alphabetize: { order: 'desc' } },
  AlphaIgnore: { alphabetize: { order: 'ignore' } },
  CaseSensitive: { alphabetize: { order: 'asc', caseInsensitive: false } },
  NeverNL: { newlinesBetween: 'never' },
  IgnoreNL: { newlinesBetween: 'ignore' },
  TypeGroups: {
    groups: [
      'builtin',
      'external',
      'type',
      'internal',
      'parent',
      'sibling',
      'index',
      'side-effect',
    ],
  },
};

module.exports = {
  rule: 'enforce-import-order',
  domain: 13 * 12 * 2 + 7 * 6 * 2 * 6,
  traces: 6000,
  key: keyOf('focus', 'first', 'second', 'blank', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) =>
    src(
      line(tag(s.first), 'First'),
      ...(s.blank ? [''] : []),
      line(tag(s.second), 'Second'),
      'export const used = [First, Second];',
    ),
};
