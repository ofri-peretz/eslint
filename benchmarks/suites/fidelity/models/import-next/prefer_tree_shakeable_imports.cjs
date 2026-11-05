const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Exact: 'big',
  Subpath: 'big/sub',
  PrefixTwin: 'bigger',
  Relative: './big',
};

const line = (form, spec) => {
  const q = JSON.stringify(spec);
  if (form === 'TypeDefault') return `import type Big from ${q};`;
  if (form === 'TypeNamespace') return `import type * as Big from ${q};`;
  if (form === 'DefaultAndNamed') return `import Big, { a } from ${q};`;
  return importOf(form, spec);
};

const TARGETS = [{ name: 'big' }];
const CONFIG = {
  Configured: { targetPackages: TARGETS },
  ConfiguredBlockAll: {
    targetPackages: TARGETS,
    blockAllNamespaceImports: true,
  },
  Empty: { targetPackages: [] },
  EmptyBlockAll: { targetPackages: [], blockAllNamespaceImports: true },
};

module.exports = {
  rule: 'prefer-tree-shakeable-imports',
  domain: 8 * 4 * 4,
  traces: 1000,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(line(tag(s.form), SPEC[tag(s.spec)])),
};
