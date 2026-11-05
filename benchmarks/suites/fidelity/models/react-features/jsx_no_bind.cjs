const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

const VALUE = {
  Dotted: 'this.save.bind(this)',
  Computed: "this.save['bind'](this)",
  Optional: 'this.save.bind?.(this)',
  Ternary: 'this.props.ok ? this.save.bind(this) : undefined',
  Logical: 'this.props.ok && this.save.bind(this)',
  Arrow: '() => this.save()',
  Ref: 'this.save',
  OtherCall: 'track(this.save)',
};

module.exports = {
  rule: 'jsx-no-bind',
  domain: 8 * 2,
  traces: 300,
  filename: FILE,
  key: keyOf('value', 'target'),
  code: (s) => {
    const el = tag(s.target) === 'Intrinsic' ? 'button' : 'Button';
    return src(
      "import { Component } from 'react';",
      "import { Button } from './ui';",
      'declare function track(f: any): any;',
      'export class App extends Component<any> {',
      '  save() {}',
      `  render() { return <${el} onClick={${VALUE[tag(s.value)]}} />; }`,
      '}',
    );
  },
};
