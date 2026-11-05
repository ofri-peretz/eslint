const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** One import of `spec`; `i` keeps the two statements' bindings apart. */
const FORM = {
  Named: (q, i) => `import { v${i} } from ${q};`,
  Default: (q, i) => `import d${i} from ${q};`,
  Namespace: (q, i) => `import * as ns${i} from ${q};`,
  SideEffect: (q) => `import ${q};`,
  TypeOnly: (q, i) => `import type { T${i} } from ${q};`,
  InlineType: (q, i) => `import { type T${i} } from ${q};`,
};

const MODULE = [
  'export const v1 = 1;',
  'export const v2 = 2;',
  'export type T1 = 1;',
  'export type T2 = 2;',
  'export default 0;',
];

/** The second statement's specifier, for the first's './m'. */
const SECOND = {
  Same: './m',
  Other: './other',
  Query: './m?raw',
  ExtJs: './m.js',
  Index: './m/index',
};

const q = (spec) => JSON.stringify(spec);

function code(s) {
  const a = FORM[tag(s.first)](q('./m'), 1);
  const b = FORM[tag(s.second)](q(SECOND[tag(s.relation)]), 2);
  switch (tag(s.scope)) {
    case 'SplitModules':
      return src(
        `declare module 'a' {`,
        `  ${a}`,
        '}',
        `declare module 'b' {`,
        `  ${b}`,
        '}',
      );
    case 'OneModuleBlock':
      return src(`declare module 'a' {`, `  ${a}`, `  ${b}`, '}');
    default:
      return src(a, b, 'export {};');
  }
}

module.exports = {
  rule: 'no-duplicates',
  // Forms 6 x 6, Relations 3 x 4, Scopes 2.
  domain: 36 + 12 + 2,
  traces: 600,
  key: keyOf('focus', 'first', 'second', 'relation', 'scope'),
  filename: (s) =>
    tag(s.scope) === 'TopLevel' ? 'src/app.ts' : 'src/types.d.ts',
  files: (s) =>
    tag(s.relation) === 'Index'
      ? { 'src/m/index.ts': src(MODULE), 'src/other.ts': src(MODULE) }
      : { 'src/m.ts': src(MODULE), 'src/other.ts': src(MODULE) },
  code,
};
