const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Exact: '@old/lib',
  Subpath: '@old/lib/x',
  Replacement: '@new/lib',
  Embedded: './vendor/@old/lib',
};

const MAPPING = { deprecated: '^@old/lib', replacement: '@new/lib' };
const CONFIG = {
  Mapped: { mappings: [MAPPING] },
  MappedError: { mappings: [MAPPING], severity: 'error' },
  Empty: { mappings: [] },
};

module.exports = {
  rule: 'no-legacy-imports',
  domain: 13 * 4 * 3,
  traces: 1200,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
