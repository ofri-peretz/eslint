const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const CONTENT = {
  Statements: ['const a = 1;', 'console.log(a);'],
  Empty: ['// nothing here yet'],
  UseStrict: ["'use strict';", 'const a = 1;', 'console.log(a);'],
  ImportDecl: ["import a from './a';", 'console.log(a);'],
  TypeImport: [
    "import type { A } from './a';",
    'const a: A | null = null;',
    'console.log(a);',
  ],
  SideEffectImport: ["import './polyfill';"],
  ExportNamed: ['export const a = 1;'],
  ExportEmpty: ['const a = 1;', 'console.log(a);', 'export {};'],
  ExportDefault: ['export default 1;'],
  ExportAll: ["export * from './a';"],
  ExportAssign: ['const a = 1;', 'export = a;'],
  ImportEquals: ["import a = require('./a');", 'console.log(a);'],
  DynamicImportOnly: [
    "const lazy = () => import('./a');",
    'console.log(lazy);',
  ],
  ImportMetaOnly: ['console.log(import.meta.url);'],
  CommonJs: ["const a = require('./a');", 'module.exports = a;'],
};

module.exports = {
  rule: 'unambiguous',
  domain: 15 * 2,
  traces: 300,
  key: keyOf('content', 'file'),
  filename: (s) => (tag(s.file) === 'Cjs' ? 'src/app.cjs' : 'src/app.ts'),
  code: (s) => src(CONTENT[tag(s.content)]),
};
