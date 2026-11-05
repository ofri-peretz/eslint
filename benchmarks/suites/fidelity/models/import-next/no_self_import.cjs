const { tag } = require('../../lib.cjs');
const { keyOf, src, importOf } = require('../../imports.cjs');

const FILE = {
  Plain: { path: 'src/app.ts', base: 'app', parent: '../src/app' },
  Index: { path: 'src/lib/index.ts', base: 'index', parent: '../lib' },
  TestFile: {
    path: 'src/app.test.ts',
    base: 'app.test',
    parent: '../src/app.test',
  },
};

function specOf(file, spec) {
  const f = FILE[file];
  return {
    Bare: `./${f.base}`,
    Js: `./${f.base}.js`,
    Ts: `./${f.base}.ts`,
    Tsx: `./${f.base}.tsx`,
    Dot: '.',
    DotSlash: './',
    Parent: f.parent,
    Css: `./${f.base}.css`,
    Sibling: './other',
    Package: 'app',
  }[spec];
}

function load(form, spec) {
  const q = JSON.stringify(spec);
  switch (form) {
    case 'Import':
      return importOf('Named', spec);
    case 'InlineTypeAll':
      return `import { type a } from ${q};`;
    case 'ExportFrom':
      return importOf('ExportNamed', spec);
    case 'ShadowedRequire':
      return `export function load(require: (s: string) => unknown) { return require(${q}); }`;
    default:
      return importOf(form, spec);
  }
}

module.exports = {
  rule: 'no-self-import',
  // Specs 3 x 10, Forms 2 x 10, Opts 2 x 2.
  domain: 30 + 20 + 4,
  traces: 700,
  key: keyOf('focus', 'file', 'spec', 'form', 'allowInTests'),
  filename: (s) => FILE[tag(s.file)].path,
  config: (s) => (s.allowInTests ? { allowInTests: true } : undefined),
  code: (s) =>
    src(
      load(tag(s.form), specOf(tag(s.file), tag(s.spec))),
      'export const a = 1;',
    ),
};
