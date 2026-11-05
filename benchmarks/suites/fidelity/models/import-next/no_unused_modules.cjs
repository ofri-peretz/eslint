const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const EXP = {
  NoExport: ['console.log(1);'],
  EsmNamed: ['export const a = 1;'],
  EsmDefault: ['export default 1;'],
  ExportAll: ["export * from './m';"],
  ExportEquals: ['const v = 1;', 'export = v;'],
  ModuleExports: ['module.exports = { a: 1 };'],
  ModuleExportsBracket: ["module['exports'] = { a: 1 };"],
  ExportsProp: ['exports.a = 1;'],
  ModuleExportsProp: ['module.exports.a = 1;'],
  DefineProperty: ["Object.defineProperty(exports, 'a', { value: 1 });"],
  ShadowedExports: [
    'function fill(exports: any) {',
    '  exports.a = 1;',
    '}',
    'fill({});',
  ],
  EmptyExport: ['console.log(1);', 'export {};'],
  TypeExport: ['export type T = 1;'],
};

const IMP = {
  NoImport: [],
  EsmImport: ["import './setup';"],
  RequireCall: ["const setup = require('./setup');"],
  ImportEquals: ["import setup = require('./setup');"],
};

module.exports = {
  rule: 'no-unused-modules',
  domain: 13 * 4 * 2,
  traces: 900,
  key: keyOf('exp', 'imp', 'allowImportOnly'),
  config: (s) => (s.allowImportOnly ? { allowImportOnly: true } : undefined),
  code: (s) => src(IMP[tag(s.imp)], EXP[tag(s.exp)]),
};
