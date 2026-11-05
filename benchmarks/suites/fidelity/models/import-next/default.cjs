const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const INNER = {
  'src/inner.ts': src('export const a = 1;', 'export default a;'),
};

/** `./dep` resolves to `src/dep.ts`, or `src/dep.cjs` for CommonJS. */
const TARGET = {
  DefaultDecl: {
    'src/dep.ts': src('export const a = 1;', 'export default a;'),
  },
  DefaultSpecifier: {
    'src/dep.ts': src('export const a = 1;', 'export { a as default };'),
  },
  ReexportDefault: {
    'src/dep.ts': src("export { default, a } from './inner';"),
    ...INNER,
  },
  CommonJs: { 'src/dep.js': src('module.exports = { a: 1 };') },
  NamedOnly: { 'src/dep.ts': src('export const a = 1;') },
  StarOnly: { 'src/dep.ts': src("export * from './inner';"), ...INNER },
  Unresolved: {},
};

const FORM = {
  DefaultImport: "import x from './dep';",
  DefaultWithNamed: "import x, { a } from './dep';",
  DefaultAsNamed: "import { default as x } from './dep';",
  ExportDefaultFrom: "export { default } from './dep';",
  Namespace: "import * as x from './dep';",
  TypeOnly: "import type x from './dep';",
};

module.exports = {
  rule: 'default',
  typed: true,
  domain: 7 * 6,
  traces: 400,
  key: keyOf('target', 'form'),
  files: (s) => TARGET[tag(s.target)],
  code: (s) => src(FORM[tag(s.form)], 'export const used = 1;'),
};
