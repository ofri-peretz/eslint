const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Pkg: 'old-lib',
  PkgSub: 'old-lib/sub',
  PrefixTwin: 'old-lib-ng',
  Scoped: '@old/sdk',
  ScopedSub: '@old/sdk/x',
  DeepPath: 'kit/legacy',
  BelowDeepPath: 'kit/legacy/x',
  DeepRoot: 'kit',
  DeepSibling: 'kit/modern',
  Relative: './old-lib',
};

const MAPPINGS = ['old-lib', '@old/sdk', 'kit/legacy'].map((deprecated) => ({
  deprecated,
  modern: 'new-lib',
  reason: 'unmaintained',
}));
const CONFIG = {
  CustomOnly: { customMappings: MAPPINGS, disableBuiltIn: true },
  CustomAndBuiltIn: { customMappings: MAPPINGS },
  NoCustom: undefined,
};

module.exports = {
  rule: 'prefer-modern-api',
  domain: 11 + 10 * 3,
  traces: 800,
  key: keyOf('focus', 'form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
