const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** One export of `n`; `i` keeps the helper names of the two exports apart. */
const KIND = {
  Const: (n) => [`export const ${n} = 1;`],
  Function: (n) => [`export function ${n}() {}`],
  Class: (n) => [`export class ${n} {}`],
  Interface: (n, i) => [`export interface ${n} { a${i}: 1 }`],
  TypeAlias: (n, i) => [`export type ${n} = { a${i}: 1 };`],
  Enum: (n, i) => [`export enum ${n} { A${i} = ${i} }`],
  EnumBare: (n, i) => [`export enum ${n} { B${i} }`],
  Namespace: (n, i) => [`export namespace ${n} { export const z${i} = 1; }`],
  TypeNamespace: (n, i) => [`export namespace ${n} { export type Z${i} = 1; }`],
  Specifier: (n, i) => [`const v${i} = 1;`, `export { v${i} as ${n} };`],
  TypeSpecifier: (n, i) => [
    `type T${i} = 1;`,
    `export type { T${i} as ${n} };`,
  ],
  Reexport: (n, i) => [`export { x as ${n} } from './m${i}';`],
  StarAs: (n, i) => [`export * as ${n} from './m${i}';`],
  Destructured: (n, i) => [
    `const o${i} = { ${n}: 1 };`,
    `export const { ${n} } = o${i};`,
  ],
};

const DEFAULTS = {
  NoDefault: [],
  OneDecl: ['export default 1;'],
  DeclDecl: ['export default 1;', 'export default function f() {}'],
  DeclSpec: ['const d = 1;', 'export { d as default };', 'export default 2;'],
  SpecSpec: [
    'const d = 1;',
    'const e = 2;',
    'export { d as default };',
    'export { e as default };',
  ],
  ReexportAndDecl: ["export { default } from './m1';", 'export default 2;'],
  StarAndDecl: ["export * from './m1';", 'export default 2;'],
};

function code(s) {
  if (tag(s.focus) === 'Defaults') return src(DEFAULTS[tag(s.dflt)]);
  return src(
    KIND[tag(s.first)]('N', 1),
    KIND[tag(s.second)](s.sameName ? 'N' : 'M', 2),
  );
}

module.exports = {
  rule: 'export',
  // 14 x 14 kinds x same/different name, plus 7 default shapes.
  domain: 14 * 14 * 2 + 7,
  traces: 3200,
  key: keyOf('focus', 'first', 'second', 'sameName', 'dflt'),
  code,
};
