const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');

// [statement before the call, setState arguments]
const ARG = {
  DirectState: ['', '{ count: this.state.count + 1 }'],
  ComputedState: ['', "{ count: this['state'].count + 1 }"],
  UpdaterReadsState: ['', '(prev: any) => ({ count: this.state.count + 1 })'],
  UpdaterPrev: ['', '(prev: any) => ({ count: prev.count + 1 })'],
  NoState: ['', '{ count: 1 }'],
  LocalFromState: ['const { count } = this.state; ', '{ count: count + 1 }'],
  LocalUnrelated: ['const count = this.props.start; ', '{ count: count + 1 }'],
  CallbackReadsState: ['', '{ count: 1 }, () => console.log(this.state.count)'],
};

module.exports = {
  rule: 'no-access-state-in-setstate',
  domain: 2 * 8 * 2,
  traces: 600,
  filename: FILE,
  key: keyOf('receiver', 'arg', 'callee'),
  code: (s) => {
    const recv = tag(s.receiver) === 'This' ? 'this' : 'store';
    const call =
      tag(s.callee) === 'Dotted' ? `${recv}.setState` : `${recv}['setState']`;
    const [pre, args] = ARG[tag(s.arg)];
    return src(
      "import { Component } from 'react';",
      'declare const store: any;',
      'export class App extends Component<any, any> {',
      '  state = { count: 0 };',
      `  increment = () => { ${pre}${call}(${args}); };`,
      '  render() { return <button onClick={this.increment}>{this.state.count}</button>; }',
      '}',
    );
  },
};
