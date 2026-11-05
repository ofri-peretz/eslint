const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

// A repeated static redeclares the same name, which parses (TypeScript
// would flag it, the rule only reads order); instance members get an index.
const SLOT = {
  PropTypes: () => '  static propTypes = {};',
  DefaultPropsComputed: () => "  static ['defaultProps'] = {};",
  Gdsfp: () => '  static getDerivedStateFromProps() { return null; }',
  DisplayName: () => "  static displayName = 'App';",
  Instance: (i) => `  helper${i}() {}`,
};

module.exports = {
  rule: 'static-property-placement',
  domain: 5 * 5 * 5 * 2 * 2 * 2,
  traces: 5000,
  filename: FILE,
  key: keyOf('first', 'second', 'third', 'sup', 'classForm', 'opt'),
  config: (s) =>
    tag(s.opt) === 'Custom'
      ? {
          propertyGroups: [
            { name: 'a', properties: ['propTypes', 'displayName'] },
            {
              name: 'b',
              properties: ['defaultProps', 'getDerivedStateFromProps'],
            },
          ],
        }
      : undefined,
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    const decl = tag(s.classForm) === 'Decl';
    return src(
      pre,
      decl ? `export class App${ext} {` : `export const App = class${ext} {`,
      [s.first, s.second, s.third].map((v, i) => SLOT[tag(v)](i)),
      '  render() { return null; }',
      decl ? '}' : '};',
    );
  },
};
