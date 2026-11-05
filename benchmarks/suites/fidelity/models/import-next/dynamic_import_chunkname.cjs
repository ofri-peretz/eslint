const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const COMMENT = {
  NoComment: '',
  ValidName: '/* webpackChunkName: "chunk-a" */ ',
  Placeholder: '/* webpackChunkName: "[request]" */ ',
  BadName: '/* webpackChunkName: "chunk a!" */ ',
  Eager: '/* webpackMode: "eager" */ ',
};
const CALLEE = {
  ImportExpr: 'import',
  CustomFn: 'dynamicImport',
  OtherFn: 'load',
};

module.exports = {
  rule: 'dynamic-import-chunkname',
  domain: 3 * 5 * 2 * 2 * 2,
  traces: 1000,
  key: keyOf('callee', 'comment', 'allowEmpty', 'importFunctions', 'format'),
  config: (s) => ({
    ...(s.allowEmpty && { allowEmpty: true }),
    ...(s.importFunctions && { importFunctions: ['dynamicImport'] }),
    ...(tag(s.format) === 'CustomFormat' && {
      webpackChunknameFormat: '[a-z-]+',
    }),
  }),
  code: (s) =>
    src(
      'declare function dynamicImport(p: string): Promise<unknown>;',
      'declare function load(p: string): Promise<unknown>;',
      `export const page = () => ${CALLEE[tag(s.callee)]}(${COMMENT[tag(s.comment)]}'./pages/a');`,
    ),
};
