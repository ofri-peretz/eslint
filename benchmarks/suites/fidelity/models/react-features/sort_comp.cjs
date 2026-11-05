const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

// `i` keeps two members of the same kind distinct; a second constructor
// would not parse, so it becomes another lifecycle (the same group).
const MEMBER = {
  StaticVar: (i) => `  static label${i} = 'x';`,
  StaticMethod: (i) => `  static make${i}() { return null; }`,
  InstanceVar: (i) => `  count${i} = 0;`,
  Ctor: (i, firstIsCtor) =>
    i === 1 && firstIsCtor
      ? '  componentDidCatch() {}'
      : '  constructor(props: any) { super(props); }',
  Lifecycle: (i) =>
    i === 0 ? '  componentDidMount() {}' : '  componentWillUnmount() {}',
  Other: (i) => `  handle${i}() {}`,
  Render: () => '  render() { return null; }',
  RenderComputed: () => "  ['render']() { return null; }",
};

module.exports = {
  rule: 'sort-comp',
  domain: 8 * 8 * 3 * 2 * 2,
  traces: 4000,
  filename: FILE,
  key: keyOf('first', 'second', 'sup', 'classForm', 'opt'),
  config: (s) =>
    tag(s.opt) === 'Reversed'
      ? {
          order: [
            'render',
            'everything-else',
            'lifecycle',
            'instance-variables',
            'static-methods',
            'static-variables',
          ],
        }
      : undefined,
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    const decl = tag(s.classForm) === 'Decl';
    return src(
      pre,
      decl ? `export class App${ext} {` : `export const App = class${ext} {`,
      MEMBER[tag(s.first)](0),
      MEMBER[tag(s.second)](1, tag(s.first) === 'Ctor'),
      decl ? '}' : '};',
    );
  },
};
