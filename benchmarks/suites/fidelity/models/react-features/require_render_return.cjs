const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

const BODY = {
  ReturnJsx: ['  render() {', '    return <div>Hello</div>;', '  }'],
  NoReturn: ['  render() {', '    <div>Hello</div>;', '  }'],
  IfOnly: [
    '  render() {',
    '    if (this.props.show) {',
    '      return <div>Hello</div>;',
    '    }',
    '  }',
  ],
  IfElse: [
    '  render() {',
    '    if (this.props.show) {',
    '      return <div>Hello</div>;',
    '    } else {',
    '      return null;',
    '    }',
    '  }',
  ],
  SwitchNoDefault: [
    '  render() {',
    '    switch (this.props.kind) {',
    "      case 'a':",
    '        return <div>A</div>;',
    '    }',
    '  }',
  ],
  SwitchDefault: [
    '  render() {',
    '    switch (this.props.kind) {',
    "      case 'a':",
    '        return <div>A</div>;',
    '      default:',
    '        return null;',
    '    }',
    '  }',
  ],
  Throws: ['  render() {', "    throw new Error('not ready');", '  }'],
  TryBoth: [
    '  render() {',
    '    try {',
    '      return <div>{this.props.make()}</div>;',
    '    } catch {',
    '      return null;',
    '    }',
    '  }',
  ],
  FieldExpr: ['  render = () => <div>Hello</div>;'],
  FieldBlockNoReturn: ['  render = () => {', '    <div>Hello</div>;', '  };'],
  FieldBlockReturn: [
    '  render = () => {',
    '    return <div>Hello</div>;',
    '  };',
  ],
};

module.exports = {
  rule: 'require-render-return',
  domain: 11 * 7 * 2,
  traces: 1000,
  filename: FILE,
  key: keyOf('body', 'sup', 'classForm'),
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    const decl = tag(s.classForm) === 'Decl';
    return src(
      pre,
      decl ? `export class App${ext} {` : `export const App = class${ext} {`,
      '  [k: string]: any;',
      BODY[tag(s.body)],
      decl ? '}' : '};',
    );
  },
};
