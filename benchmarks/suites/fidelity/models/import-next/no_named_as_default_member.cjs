const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const DEFAULT = {
  DefaultImport: (extra) =>
    extra ? `import foo, { ${extra} } from './m';` : "import foo from './m';",
  DefaultSpecifier: (extra) =>
    `import { default as foo${extra ? `, ${extra}` : ''} } from './m';`,
};

const EVIDENCE = {
  SameDecl: (d) => [d('bar')],
  OtherDecl: (d) => [d(), "import { bar } from './m';"],
  Renamed: (d) => [d(), "import { bar as b2 } from './m';"],
  Reexport: (d) => [d(), "export { bar } from './m';"],
  OtherModule: (d) => [d(), "import { bar } from './n';"],
  NoEvidence: (d) => [d()],
};

const ACCESS = {
  Dot: ['export const v = foo.bar;'],
  Bracket: ["export const v = foo['bar'];"],
  Dynamic: ['export const v = (k: string) => foo[k];'],
  Destructure: ['export const { bar: v } = foo;'],
  Shadowed: ['export const v = (foo: any) => foo.bar;'],
};

module.exports = {
  rule: 'no-named-as-default-member',
  domain: 2 * 6 * 5,
  traces: 600,
  key: keyOf('dflt', 'evidence', 'access'),
  code: (s) =>
    src(EVIDENCE[tag(s.evidence)](DEFAULT[tag(s.dflt)]), ACCESS[tag(s.access)]),
};
