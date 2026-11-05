const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const EXP = {
  None: () => [],
  Const: (i) => [`export const a${i} = 1;`],
  Enum: (i) => [`export enum E${i} { X }`],
  DestructuredOne: (i) => [`export const { p${i} } = { p${i}: 1 };`],
  DestructuredTwo: (i) => [
    `export const { p${i}, q${i} } = { p${i}: 1, q${i}: 2 };`,
  ],
  Specifier: (i) => [`const s${i} = 1;`, `export { s${i} };`],
  AsDefault: (i) => [`const d${i} = 1;`, `export { d${i} as default };`],
  Default: (i) => [`export default function f${i}() {}`],
  ReexportNamed: (i) => [`export { r${i} } from './m${i}';`],
  ReexportDefault: (i) => [`export { default } from './m${i}';`],
  ExportAll: (i) => [`export * from './all${i}';`],
  TypeAlias: (i) => [`export type T${i} = string;`],
};
const DEFAULTISH = new Set(['AsDefault', 'Default', 'ReexportDefault']);
const OPTS = {
  Always: { target: 'always' },
  AsNeeded: { target: 'as-needed' },
  IgnoreSubstring: { ignoreFiles: ['src/app'] },
  IgnoreGlob: { ignoreFiles: ['**/src/*.ts'] },
  AllowNamed: { allowNamedExports: true },
};

module.exports = {
  rule: 'prefer-default-export',
  domain: 12 * 7 * 6,
  traces: 4000,
  key: keyOf('e1', 'e2', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => {
    const a = tag(s.e1);
    // A second default would be a duplicate export: write it as a named const.
    const b =
      DEFAULTISH.has(a) && DEFAULTISH.has(tag(s.e2)) ? 'None' : tag(s.e2);
    return src(EXP[a](1), EXP[b](2), 'console.log(1);');
  },
};
