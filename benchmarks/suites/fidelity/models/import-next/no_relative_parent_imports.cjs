const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  Parent: '../x',
  ParentBare: '..',
  DotParent: './../x',
  Embedded: './a/../../x',
  InsideViaDots: './a/../b',
  Sibling: './x',
  Package: 'lodash',
};

const line = (form, spec) => {
  const q = JSON.stringify(spec);
  if (form === 'AmdDefine')
    return `define([${q}], function (x) { return x; });`;
  if (form === 'AmdRequire')
    return `require([${q}], function (x) { return x; });`;
  return importOf(form, spec);
};

const CONFIG = {
  Defaults: undefined,
  NoCommonjs: { commonjs: false },
  Amd: { amd: true },
};

module.exports = {
  rule: 'no-relative-parent-imports',
  domain: 15 * 7 * 3,
  traces: 2500,
  key: keyOf('form', 'spec', 'config'),
  config: (s) => CONFIG[tag(s.config)],
  code: (s) => src(line(tag(s.form), SPEC[tag(s.spec)])),
};
