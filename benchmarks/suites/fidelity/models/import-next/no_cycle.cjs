const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

/** The linted file's import of `./b`, with every binding used as a value. */
const OUT = {
  ODefault: ["import b from './b';", 'export const use = () => b;'],
  ONamed: ["import { b } from './b';", 'export const use = () => b;'],
  ONamedType: ["import { T } from './b';", 'export const use = (t: T) => t;'],
  OInlineType: [
    "import { type T } from './b';",
    'export const use = (t: T) => t;',
  ],
  OTypeOnly: [
    "import type { T } from './b';",
    'export const use = (t: T) => t;',
  ],
  OSideEffect: ["import './b';"],
  ONamespace: ["import * as ns from './b';", 'export const use = () => ns.b;'],
  OExportNamed: ["export { b } from './b';"],
  OExportAll: ["export * from './b';"],
  OExportAllAs: ["export * as ns from './b';"],
  ORequire: ["const m = require('./b');", 'export const use = () => m.b;'],
  ODynamic: ["export const load = () => import('./b');"],
  OImportEquals: [
    "import m = require('./b');",
    'export const use = () => m.b;',
  ],
};

/** The edge back to the linted module, written in `from` (b.ts or c.ts). */
const BACK = {
  BValue: (to) => [
    `import { run } from '${to}';`,
    'export const back = () => run();',
  ],
  BTypeOnly: (to) => [
    `import type { AppType } from '${to}';`,
    'export const back = (a: AppType) => a;',
  ],
  BInlineType: (to) => [
    `import { type AppType } from '${to}';`,
    'export const back = (a: AppType) => a;',
  ],
  BImplicitType: (to) => [
    `import { AppType } from '${to}';`,
    'export const back = (a: AppType) => a;',
  ],
  BSideEffect: (to) => [`import '${to}';`],
  BExportNamed: (to) => [`export { run } from '${to}';`],
  BExportType: (to) => [`export type { AppType } from '${to}';`],
  BExportAll: (to) => [`export * from '${to}';`],
  BRequire: (to) => [
    `const app = require('${to}');`,
    'export const back = () => app.run();',
  ],
  BDynamic: (to) => [`export const back = () => import('${to}');`],
  BNone: () => [],
  // Through `./barrel`, which re-exports the linted module (`barrelOf`).
  BBarrelType: () => [
    "import { AppType } from './barrel';",
    'export const back = (a: AppType) => a;',
  ],
  BBarrelValue: () => [
    "import { run } from './barrel';",
    'export const back = () => run();',
  ],
};

/** `src/barrel.ts`, for the back edges that go through it. */
const barrelOf = (s) =>
  tag(s.back).startsWith('BBarrel')
    ? { 'src/barrel.ts': src(`export * from '${appSpec(s)}';`) }
    : {};

const B_EXPORTS = [
  'export const b = 1;',
  'export default b;',
  'export interface T { t: number }',
];

const OPTS = {
  Default: undefined,
  Verbatim: { verbatimModuleSyntax: true },
  TestDefault: undefined,
  TestNoIgnore: { ignorePatterns: [] },
  DepthOne: { maxDepth: 1 },
  DepthTen: { maxDepth: 10 },
};

const isTest = (s) => ['TestDefault', 'TestNoIgnore'].includes(tag(s.opts));
const appPath = (s) => (isTest(s) ? 'src/app.test.ts' : 'src/app.ts');
const appSpec = (s) => (isTest(s) ? './app.test' : './app');

module.exports = {
  rule: 'no-cycle',
  domain: 13 * 13 * 4 + 3 * 2 - 1, // Hops(Two, Default) is a Grid input
  traces: 11000,
  key: keyOf('out', 'back', 'opts', 'len'),
  config: (s) => OPTS[tag(s.opts)],
  filename: appPath,
  files: (s) => {
    const back = BACK[tag(s.back)](appSpec(s));
    if (tag(s.len) === 'Three')
      return {
        ...barrelOf(s),
        'src/b.ts': src(
          "import { c } from './c';",
          ...B_EXPORTS,
          'export const viaC = () => c;',
        ),
        'src/c.ts': src(...back, 'export const c = 1;'),
      };
    return { ...barrelOf(s), 'src/b.ts': src(...back, ...B_EXPORTS) };
  },
  code: (s) =>
    src(
      ...OUT[tag(s.out)],
      'export const run = () => 1;',
      'export interface AppType { a: number }',
    ),
};
