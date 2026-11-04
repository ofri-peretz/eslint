const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../quality.cjs');

const DECL = {
  Const: 'const count = 0;',
  Let: 'let count = 0;',
  Var: 'var count = 0;',
  Function: 'function count() { return 0; }',
  Class: 'class count {}',
};

function file(kind, form) {
  const decl = DECL[kind];
  switch (form) {
    case 'Inline':
      return [`export ${decl}`];
    case 'Specifier':
      return [decl, 'export { count };'];
    case 'RenamedSpecifier':
      return [decl, 'export { count as total };'];
    case 'DefaultExport':
      return [decl, 'export default count;'];
    case 'Reexport':
      return ["export { count } from './state';"];
    default:
      return [decl, 'export const read = () => count;'];
  }
}

module.exports = {
  rule: 'no-mutable-exports',
  domain: 5 * 6,
  traces: 300,
  key: keyOf('kind', 'form'),
  code: (s) => src(file(tag(s.kind), tag(s.form))),
};
