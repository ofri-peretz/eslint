const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const IMP = {
  NoImport: [],
  ValueImport: ["import dep from './dep';"],
  TypeImport: ["import type { Dep } from './dep';"],
  DynamicImport: ["const lazy = () => import('./dep');"],
};
const USE = {
  ModuleExportsAssign: ['module.exports = { run: 1 };'],
  ModuleExportsComputed: ["module['exports'] = { run: 1 };"],
  ModuleExportsProp: ['module.exports.run = 1;'],
  ExportsProp: ['exports.run = 1;'],
  ModuleExportsRead: ['console.log(module.exports);'],
  LocalParams: [
    'function wrap(module: any, exports: any) {',
    '  module.exports = exports;',
    '  exports.run = 1;',
    '}',
    'console.log(wrap);',
  ],
  EsmExport: ['export const run = 1;'],
};
const EXC = {
  ExceptionMatch: ['**/src/app.ts'],
  ExceptionOther: ['**/legacy/**'],
};

module.exports = {
  rule: 'no-import-module-exports',
  domain: 4 * 7 * 3,
  traces: 600,
  key: keyOf('imp', 'use', 'exc'),
  config: (s) => {
    const exceptions = EXC[tag(s.exc)];
    return exceptions ? { exceptions } : undefined;
  },
  code: (s) => src(IMP[tag(s.imp)], USE[tag(s.use)]),
};
