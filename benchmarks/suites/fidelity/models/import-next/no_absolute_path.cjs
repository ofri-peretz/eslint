const { tag } = require('../../lib.cjs');
const { keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Absolute: '/srv/app/lib/util',
  Relative: './lib/util',
  Package: 'lodash',
};
const OPTS = {
  NoEsm: { esmodule: false },
  NoCjs: { commonjs: false },
  WithAmd: { amd: true },
};

function line(form, spec) {
  const q = `'${spec}'`;
  switch (form) {
    case 'Import':
      return [`import util from ${q};`, 'export const v = util;'];
    case 'SideEffect':
      return [`import ${q};`];
    case 'ExportNamed':
      return [`export { util } from ${q};`];
    case 'ExportAll':
      return [`export * from ${q};`];
    case 'Dynamic':
      return [`export const load = () => import(${q});`];
    case 'DynamicTemplate':
      return [`export const load = () => import(\`${spec}\`);`];
    case 'Require':
      return [`const util = require(${q});`, 'export const v = util;'];
    case 'RequireTemplate':
      return [`const util = require(\`${spec}\`);`, 'export const v = util;'];
    case 'ImportEquals':
      return [`import util = require(${q});`, 'export const v = util;'];
    case 'AmdDefine':
      return [`define([${q}], function (util) { return util; });`];
    default:
      return [`require([${q}], function (util) { return util; });`];
  }
}

module.exports = {
  rule: 'no-absolute-path',
  domain: 11 * 3 * 4,
  traces: 1000,
  key: keyOf('form', 'spec', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => src(line(tag(s.form), SPEC[tag(s.spec)])),
};
