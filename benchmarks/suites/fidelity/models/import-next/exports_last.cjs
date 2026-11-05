const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const STMT = {
  Plain: (i) => `console.log(v${i});`,
  ExportList: (i) => `export { v${i} };`,
  // One default per file at most: only the first one is `export default`.
  ExportDefault: (i, first) =>
    first ? `export default v${i};` : `export { v${i} as d${i} };`,
  ExportAll: (i) => `export * from './m${i}';`,
  ExportInline: (i) => `export const w${i} = ${i};`,
};

module.exports = {
  rule: 'exports-last',
  domain: 5 * 5 * 5,
  traces: 900,
  key: keyOf('s1', 's2', 's3'),
  code: (s) => {
    const kinds = [tag(s.s1), tag(s.s2), tag(s.s3)];
    let seenDefault = false;
    const lines = kinds.map((k, i) => {
      const first = k === 'ExportDefault' && !seenDefault;
      if (k === 'ExportDefault') seenDefault = true;
      return STMT[k](i, first);
    });
    return src('const v0 = 0, v1 = 1, v2 = 2;', lines);
  },
};
