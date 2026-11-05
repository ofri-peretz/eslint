const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const VALIDATOR = {
  VString: 'string',
  VNumber: 'number',
  VBool: 'bool',
  VFunc: 'func',
};
const VALUE = {
  StrLit: "'Guest'",
  Template: '`Guest`',
  NumLit: '0',
  Negative: '-1',
  BoolLit: 'false',
  NullLit: 'null',
  Dynamic: 'fallback',
};

function validator(p, v) {
  switch (p) {
    case 'Member':
      return {
        pre: "import PropTypes from 'prop-types';",
        ref: `PropTypes.${v}`,
      };
    case 'Computed':
      return {
        pre: "import PropTypes from 'prop-types';",
        ref: `PropTypes['${v}']`,
      };
    case 'Renamed':
      return { pre: "import PT from 'prop-types';", ref: `PT.${v}` };
    case 'NamedImport':
      return { pre: `import { ${v} } from 'prop-types';`, ref: v };
    default:
      return {
        pre: "import PropTypes from 'prop-types';",
        ref: `PropTypes.${v}.isRequired`,
      };
  }
}

module.exports = {
  rule: 'default-props-match-prop-types',
  domain: 4 * 7 * 5 * 2 * 2,
  traces: 4000,
  filename: FILE,
  key: keyOf('validator', 'value', 'ptSpelling', 'form', 'key'),
  code: (s) => {
    const { pre, ref } = validator(
      tag(s.ptSpelling),
      VALIDATOR[tag(s.validator)],
    );
    const k = tag(s.key) === 'Quoted' ? "'label'" : 'label';
    const pt = `{ ${k}: ${ref} }`;
    const dp = `{ ${k}: ${VALUE[tag(s.value)]} }`;
    const head = [
      pre,
      "import React from 'react';",
      'declare const fallback: any;',
    ];
    if (tag(s.form) === 'StaticField') {
      return src(
        head,
        'export class App extends React.Component<any> {',
        `  static propTypes = ${pt};`,
        `  static defaultProps = ${dp};`,
        '  render() { return <span>{this.props.label}</span>; }',
        '}',
      );
    }
    return src(
      head,
      'export function App({ label }: any) { return <span>{label}</span>; }',
      `App.propTypes = ${pt};`,
      `App.defaultProps = ${dp};`,
    );
  },
};
