const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const VERSION = {
  Exact: '18.2.0',
  Caret: '^18.2.0',
  Tilde: '~18.2.0',
  Range: '>=18.0.0 <19.0.0',
  Workspace: 'workspace:*',
  File: 'file:../react',
  Link: 'link:../react',
  Tag: 'latest',
};

const CONFIG = {
  Default: undefined,
  TildeS: { strategy: 'tilde' },
  ExactS: { strategy: 'exact' },
  RangeS: { strategy: 'range' },
  AnyWithOverride: { strategy: 'any', overrides: { react: 'exact' } },
  OverrideAny: { overrides: { react: 'any' } },
  ProtocolsOff: { allowWorkspace: false, allowFile: false, allowLink: false },
};

module.exports = {
  rule: 'prefer-dependency-version-strategy',
  domain: 8 * 7 * 2,
  traces: 1000,
  key: keyOf('version', 'config', 'block'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) =>
    src(
      'export const manifest = {',
      `  ${tag(s.block) === 'Deps' ? 'dependencies' : 'versions'}: { react: '${VERSION[tag(s.version)]}' },`,
      '};',
    ),
};
