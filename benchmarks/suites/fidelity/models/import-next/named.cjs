const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const TARGET = {
  ExistsConst: { 'src/dep.ts': src('export const a = 1;') },
  ExistsViaStar: {
    'src/dep.ts': src("export * from './inner';"),
    'src/inner.ts': src('export const a = 1;'),
  },
  ExistsRenamedExport: {
    'src/dep.ts': src('const v = 1;', 'export { v as a };'),
  },
  ExistsTypeOnly: { 'src/dep.ts': src('export type a = 1;') },
  Missing: { 'src/dep.ts': src('export const b = 1;') },
  OnlyDefault: { 'src/dep.ts': src('const a = 1;', 'export default a;') },
  Unresolved: {},
};

const FORM = {
  Named: "import { a } from './dep';",
  Renamed: "import { a as x } from './dep';",
  InlineType: "import { type a } from './dep';",
  TypeOnly: "import type { a } from './dep';",
  ExportNamed: "export { a } from './dep';",
  ExportRenamed: "export { a as x } from './dep';",
  DefaultAsNamed: "import { default as x } from './dep';",
};

module.exports = {
  rule: 'named',
  typed: true,
  domain: 7 * 7,
  traces: 400,
  key: keyOf('target', 'form'),
  files: (s) => TARGET[tag(s.target)],
  code: (s) => src(FORM[tag(s.form)], 'export const used = 1;'),
};
