const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

const NAME = {
  UnsafeMount: 'UNSAFE_componentWillMount',
  UnsafeProps: 'UNSAFE_componentWillReceiveProps',
  UnsafeUpdate: 'UNSAFE_componentWillUpdate',
  LegacyMount: 'componentWillMount',
  LegacyProps: 'componentWillReceiveProps',
  LegacyUpdate: 'componentWillUpdate',
  DidMount: 'componentDidMount',
};
const FORM = {
  MethodDef: (n) => `  ${n}() { this.load(); }`,
  ArrowProp: (n) => `  ${n} = () => { this.load(); };`,
  ComputedKey: (n) => `  ['${n}']() { this.load(); }`,
};

module.exports = {
  rule: 'no-unsafe',
  domain: 7 * 3 * 7 * 2 * 2,
  traces: 3000,
  filename: FILE,
  key: keyOf('method', 'form', 'sup', 'classForm', 'opt'),
  config: (s) =>
    tag(s.opt) === 'Aliases' ? { checkAliases: true } : undefined,
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    const head =
      tag(s.classForm) === 'Decl'
        ? `export class App${ext} {`
        : `export const App = class${ext} {`;
    return src(
      pre,
      head,
      '  load() {}',
      FORM[tag(s.form)](NAME[tag(s.method)]),
      '  render() { return null; }',
      tag(s.classForm) === 'Decl' ? '}' : '};',
    );
  },
};
