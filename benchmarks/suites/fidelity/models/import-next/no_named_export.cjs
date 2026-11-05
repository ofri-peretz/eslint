const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

// Every named form publishes the name `a`.
const FORM = {
  Const: ['export const a = 1;'],
  Fn: ['export function a() {}'],
  Klass: ['export class a {}'],
  Enum: ['export enum a { X }'],
  Destructured: ['const obj = { a: 1 };', 'export const { a } = obj;'],
  Specifier: ['const a = 1;', 'export { a };'],
  Renamed: ['const b = 1;', 'export { b as a };'],
  StringNamed: ['const b = 1;', 'export { b as "a" };'],
  AsDefault: ['const a = 1;', 'export { a as default };'],
  ReexportDefault: ["export { default } from './m';"],
  ReexportNamed: ["export { a } from './m';"],
  ExportAll: ["export * from './m';"],
  ExportAllAs: ["export * as a from './m';"],
  TypeAlias: ['export type a = string;'],
  Interface: ['export interface a { x: string }'],
  TypeSpecifier: ['type a = string;', 'export type { a };'],
  InlineTypeSpecifier: ['type a = string;', 'export { type a };'],
  EmptyExport: ['console.log(1);', 'export {};'],
  DefaultFn: ['export default function a() {}'],
};
const OPTS = {
  AllowNamesMatch: { allowNames: ['a'] },
  AllowInFilesMatch: { allowInFiles: ['**/app.ts'] },
  AllowInFilesOther: { allowInFiles: ['**/legacy/**'] },
  AllowPatternsMatch: { allowPatterns: ['**/*.ts'] },
};

module.exports = {
  rule: 'no-named-export',
  domain: 19 * 5,
  traces: 800,
  key: keyOf('form', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => src(FORM[tag(s.form)]),
};
