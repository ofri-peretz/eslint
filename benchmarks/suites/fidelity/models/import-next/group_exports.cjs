const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const STMT = {
  ValueList: (i) => `export { v${i} };`,
  TypeList: (i) => `export type { T${i} };`,
  Inline: (i) => `export const w${i} = ${i};`,
  ReexportSame: (i) => `export { r${i} } from './m';`,
  TypeReexportSame: (i) => `export type { R${i} } from './m';`,
  ReexportOther: (i) => `export { o${i} } from './other${i}';`,
  Default: (i, first) =>
    first ? `export default v${i};` : `export { v${i} as d${i} };`,
  ExportAll: (i) => `export * from './all${i}';`,
};

module.exports = {
  rule: 'group-exports',
  domain: 8 * 8,
  traces: 500,
  key: keyOf('s1', 's2'),
  code: (s) => {
    const a = tag(s.s1);
    const b = tag(s.s2);
    // A second `export default` would be a duplicate: `Default, Default` uses
    // a list for the second, which then pairs with nothing else.
    return src(
      'const v0 = 0, v1 = 1;',
      'type T0 = string;',
      'type T1 = number;',
      STMT[a](0, true),
      a === 'Default' && b === 'Default'
        ? 'export { v1 as d1 };'
        : STMT[b](1, true),
    );
  },
};
