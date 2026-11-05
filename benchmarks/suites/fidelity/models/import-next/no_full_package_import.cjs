const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Exact: 'big',
  Subpath: 'big/sub',
  PrefixTwin: 'bigger',
  ScopedExact: '@big/icons',
};

const line = (form, spec) => {
  const q = JSON.stringify(spec);
  if (form === 'TypeDefault') return `import type Big from ${q};`;
  if (form === 'DefaultAndNamed') return `import Big, { a } from ${q};`;
  return importOf(form, spec);
};

const CONFIG = {
  Configured: {
    blockedPackages: [
      { name: 'big', suggestion: 'Use subpath imports' },
      { name: '@big/icons', suggestion: 'Import icons one by one' },
    ],
  },
  Empty: { blockedPackages: [] },
};

module.exports = {
  rule: 'no-full-package-import',
  domain: 12 * 4 * 2,
  traces: 800,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(line(tag(s.form), SPEC[tag(s.spec)])),
};
