const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Fs: 'fs',
  NodeProto: 'node:path',
  React: 'react',
  Parent: '../up',
  Sibling: './sib',
  Index: './index',
  IndexSlash: './',
};

function line(kind, binding) {
  if (kind === 'SideEffect') return `import './setup';`;
  return `import ${binding} from '${SPEC[kind]}';`;
}

const CONFIG = {
  Defaults: undefined,
  Alpha: { alphabetize: { order: 'asc' } },
  Newlines: { 'newlines-between': 'always' },
};

module.exports = {
  rule: 'order',
  // 8 kinds x 7 others x blank x 3 configs.
  domain: 8 * 7 * 2 * 3,
  traces: 3000,
  key: keyOf('first', 'second', 'blank', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) =>
    src(
      line(tag(s.first), 'First'),
      ...(s.blank ? [''] : []),
      line(tag(s.second), 'Second'),
      'export const used = [First, Second];',
    ),
};
