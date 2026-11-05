const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const SUPER = {
  Default: ["import React from 'react';", 'React.Component'],
  Renamed: ["import { Component as Base } from 'react';", 'Base'],
  Foreign: ["import { Component } from 'lit';", 'Component'],
};

module.exports = {
  rule: 'require-default-props',
  domain: 2 * 3 * 3 * 2 * 3 * 2,
  traces: 1500,
  filename: FILE,
  key: keyOf('req', 'dflt', 'propDecl', 'keySpelling', 'sup', 'opt'),
  config: (s) =>
    tag(s.opt) === 'Forbid' ? { forbidDefaultForRequired: true } : undefined,
  code: (s) => {
    const [imp, base] = SUPER[tag(s.sup)];
    const key = tag(s.keySpelling) === 'Quoted' ? "'variant'" : 'variant';
    const type =
      tag(s.req) === 'Required'
        ? 'PropTypes.string.isRequired'
        : 'PropTypes.string';
    const types = `{ ${key}: ${type}, label: PropTypes.node.isRequired }`;
    const defaults = "{ variant: 'primary' }";
    const p = tag(s.propDecl);
    const d = tag(s.dflt);
    return src(
      imp,
      "import PropTypes from 'prop-types';",
      `export class App extends ${base} {`,
      p === 'StaticField' ? [`  static propTypes = ${types};`] : [],
      p === 'ComputedField' ? [`  static ['propTypes'] = ${types};`] : [],
      d === 'InStatic' ? [`  static defaultProps = ${defaults};`] : [],
      '  render() { return null; }',
      '}',
      p === 'Assigned' ? [`(App as any).propTypes = ${types};`] : [],
      d === 'InAssigned' ? [`(App as any).defaultProps = ${defaults};`] : [],
    );
  },
};
