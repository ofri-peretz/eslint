const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

module.exports = {
  rule: 'no-find-dom-node',
  domain: 9 * 2,
  traces: 300,
  filename: FILE,
  key: keyOf('spelling', 'call'),
  code: (s) => {
    const sp = tag(s.spelling);
    const { pre, ref } =
      sp === 'Umd'
        ? { pre: [], ref: 'ReactDOM.findDOMNode' }
        : api(sp, 'findDOMNode', 'react-dom');
    const call = tag(s.call) === 'Optional' ? `${ref}?.(this)` : `${ref}(this)`;
    return src(
      pre,
      "import { Component } from 'react';",
      'export class App extends Component {',
      '  componentDidMount() {',
      `    const node = ${call};`,
      '    (node as any)?.focus();',
      '  }',
      '  render() { return null; }',
      '}',
    );
  },
};
