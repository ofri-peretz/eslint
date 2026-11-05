const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// The base class with no type arguments: `Component<any>` would not type the
// props either, but untyped is the plain case.
const SUPER = {
  Default: ["import React from 'react';", 'React.Component'],
  Renamed: ["import { Component as Base } from 'react';", 'Base'],
  Foreign: ["import { Component } from 'lit';", 'Component'],
};

module.exports = {
  rule: 'prop-types',
  // UsesProps: 5 x 3 x 2 x 3 opts; NoProps: 5 x 3 x 2 x 2 opts.
  domain: 90 + 60,
  traces: 1200,
  filename: FILE,
  key: keyOf('decl', 'use', 'sup', 'classForm', 'opt'),
  config: (s) =>
    ({
      Defaults: undefined,
      SkipUndeclared: { skipUndeclared: true },
      IgnoreApp: { ignore: ['App'] },
    })[tag(s.opt)],
  code: (s) => {
    const [imp, base] = SUPER[tag(s.sup)];
    const d = tag(s.decl);
    const ext = d === 'TypedProps' ? `${base}<{ name: string }>` : base;
    const decl = tag(s.classForm) === 'Decl';
    const render =
      tag(s.use) === 'UsesProps'
        ? '  render() { return <h1>{(this as any).props.name}</h1>; }'
        : '  render() { return <h1>Hello</h1>; }';
    return src(
      imp,
      "import PropTypes from 'prop-types';",
      decl
        ? `export class App extends ${ext} {`
        : `export const App = class extends ${ext} {`,
      d === 'StaticField'
        ? ['  static propTypes = { name: PropTypes.string };']
        : [],
      d === 'ComputedField'
        ? ["  static ['propTypes'] = { name: PropTypes.string };"]
        : [],
      render,
      decl ? '}' : '};',
      d === 'AssignedAfter'
        ? ['(App as any).propTypes = { name: PropTypes.string };']
        : [],
    );
  },
};
