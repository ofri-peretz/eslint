const { tag } = require('../../lib.cjs');
const { importOf, keyOf, src } = require('../../imports.cjs');

const SPEC = {
  LoaderChain: 'style!css!./a.css',
  LoaderPrefix: '-babel-loader!lodash',
  Plain: './a.css',
  Package: 'lodash',
  ScopedSubpath: '@scope/pkg/data.json',
};

module.exports = {
  rule: 'no-webpack-loader-syntax',
  domain: 13 * 5,
  traces: 800,
  key: keyOf('form', 'spec'),
  code: (s) => src(importOf(tag(s.form), SPEC[tag(s.spec)])),
};
