const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const SPELLING = {
  ReactDefault: [["import React from 'react';"], 'React.createClass'],
  ReactNamespace: [["import * as R from 'react';"], 'R.createClass'],
  ReactComputed: [["import React from 'react';"], "React['createClass']"],
  ReactUmd: [[], 'React.createClass'],
  CrcImport: [
    ["import createReactClass from 'create-react-class';"],
    'createReactClass',
  ],
  CrcRenamed: [["import makeClass from 'create-react-class';"], 'makeClass'],
  CrcRequire: [
    ["const createReactClass = require('create-react-class');"],
    'createReactClass',
  ],
  LocalFn: [
    ['function createReactClass(spec: any) { return spec; }'],
    'createReactClass',
  ],
  LocalReact: [
    ['const React = { createClass: (spec: any) => spec };'],
    'React.createClass',
  ],
};

module.exports = {
  rule: 'prefer-es6-class',
  domain: 9,
  traces: 100,
  filename: FILE,
  key: keyOf('spelling'),
  code: (s) => {
    const [pre, ref] = SPELLING[tag(s.spelling)];
    return src(
      pre,
      `export const App = ${ref}({`,
      '  render() { return <div>Hello</div>; },',
      '});',
    );
  },
};
