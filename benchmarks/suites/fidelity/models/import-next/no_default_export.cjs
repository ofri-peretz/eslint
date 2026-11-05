const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const FORM = {
  DefaultFn: ['export default function load() {}'],
  DefaultIdent: ['const value = 1;', 'export default value;'],
  DefaultObj: ['export default { a: 1 };'],
  DefaultInterface: ['export default interface Shape { a: string }'],
  AsDefault: ['const value = 1;', 'export { value as default };'],
  AsDefaultString: ['const value = 1;', 'export { value as "default" };'],
  ReexportDefault: ["export { default } from './m';"],
  ReexportDefaultAs: ["export { default as Widget } from './m';"],
  ReexportAsDefault: ["export { widget as default } from './m';"],
  ExportAllAsDefault: ["export * as default from './m';"],
  ExportAssign: ['const value = 1;', 'export = value;'],
  Named: ['export const value = 1;'],
  ExportAll: ["export * from './m';"],
};
const OPTS = {
  AllowInFilesMatch: { allowInFiles: ['**/app.ts'] },
  AllowInFilesOther: { allowInFiles: ['**/legacy/**'] },
  AllowPatternsMatch: { allowPatterns: ['*.ts'] },
};

module.exports = {
  rule: 'no-default-export',
  domain: 13 * 4,
  traces: 500,
  key: keyOf('form', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => src(FORM[tag(s.form)]),
};
