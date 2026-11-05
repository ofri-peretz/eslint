const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const ACCESS = {
  Dot: (n) => `return ns.${n};`,
  BracketLit: (n) => `return ns['${n}'];`,
  Dynamic: () => 'return ns[k];',
  Destructure: (n) => `const { ${n}: v } = ns; return v;`,
};

function code(s) {
  const name = tag(s.name) === 'Exists' ? 'a' : 'zz';
  const body = ACCESS[tag(s.access)](name);
  const spec = tag(s.resolution) === 'Resolved' ? './dep' : './missing';
  switch (tag(s.binding)) {
    case 'DefaultImport':
      return src(
        `import ns from '${spec}';`,
        `export const f = (k: 'a') => { ${body} };`,
      );
    case 'Shadowed':
      return src(
        `import * as used from '${spec}';`,
        'export { used };',
        `export const f = (ns: any, k: 'a') => { ${body} };`,
      );
    default:
      return src(
        `import * as ns from '${spec}';`,
        `export const f = (k: 'a') => { ${body} };`,
      );
  }
}

module.exports = {
  rule: 'namespace',
  typed: true,
  domain: 3 * 4 * 2 * 2,
  traces: 450,
  key: keyOf('binding', 'access', 'name', 'resolution'),
  files: () => ({
    'src/dep.ts': src('export const a = 1;', 'export default { a: 1 };'),
  }),
  code,
};
