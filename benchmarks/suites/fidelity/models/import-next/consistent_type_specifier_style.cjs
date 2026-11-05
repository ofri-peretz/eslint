const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const DECL = {
  TopNamed: "import type { A, B } from './t';",
  TopNamedRenamed: "import type { A as X } from './t';",
  TopDefault: "import type D from './t';",
  TopNamespace: "import type * as N from './t';",
  InlineAll: "import { type A, type B } from './t';",
  InlineMixed: "import { type A, b } from './t';",
  DefaultInline: "import d, { type A } from './t';",
  ValueOnly: "import { a, b } from './t';",
};
const STYLE = {
  PreferInline: 'prefer-inline',
  PreferTopLevel: 'prefer-top-level',
};

module.exports = {
  rule: 'consistent-type-specifier-style',
  domain: 8 * 3,
  traces: 250,
  key: keyOf('decl', 'style'),
  config: (s) => STYLE[tag(s.style)],
  code: (s) => src(DECL[tag(s.decl)], 'export {};'),
};
