const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const STMT = {
  ImpEmpty: "import {} from './m';",
  ImpEmptyComment: "import { /* nothing yet */ } from './m';",
  ImpDefaultEmpty: "import a, {} from './m';",
  ImpDefaultEmptyComment: "import a, { /* nothing yet */ } from './m';",
  ImpTypeEmpty: "import type {} from './m';",
  ImpNamed: "import { b } from './m';",
  ImpDefaultNamed: "import a, { b } from './m';",
  ImpDefault: "import a from './m';",
  ImpDefaultBraceComment: "import a /* {} */ from './m';",
  ImpSideEffect: "import './m';",
  ExpEmptyFrom: "export {} from './m';",
  ExpTypeEmptyFrom: "export type {} from './m';",
  ExpEmptyLocal: 'export {};',
  ExpNamedFrom: "export { b } from './m';",
};

module.exports = {
  rule: 'no-empty-named-blocks',
  domain: 14,
  traces: 150,
  key: keyOf('stmt'),
  code: (s) => src(STMT[tag(s.stmt)], 'export const used = 1;'),
};
