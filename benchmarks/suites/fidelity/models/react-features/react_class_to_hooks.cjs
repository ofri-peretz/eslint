const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, api, src } = require('../../react.cjs');

const BASE = {
  Pure: () => api('Named', 'PureComponent'),
  NoBase: () => ({ pre: [], ref: null }),
  Shadowed: () => ({
    pre: ['class Component<P = any> { props!: P; }'],
    ref: 'Component',
  }),
  Foreign: () => api('Foreign', 'Component'),
};
const MEMBERS = {
  RenderOnly: [],
  DerivedState: ['static getDerivedStateFromProps() { return null; }'],
  Snapshot: ['getSnapshotBeforeUpdate() { return null; }'],
  SnapshotQuoted: ["'getSnapshotBeforeUpdate'() { return null; }"],
  DidCatch: ['componentDidCatch(error: unknown) { console.error(error); }'],
  DerivedError: [
    'static getDerivedStateFromError() { return { failed: true }; }',
  ],
};
const OPTS = {
  Defaults: undefined,
  IgnorePure: { ignorePureRenderComponents: true },
  AllowComplex: { allowComplexLifecycle: true },
};

module.exports = {
  rule: 'react-class-to-hooks',
  domain: 9 * 3 * 6 * 3,
  traces: 2500,
  filename: FILE,
  key: keyOf('base', 'decl', 'members', 'opts'),
  config: (s) => OPTS[tag(s.opts)],
  code: (s) => {
    const b = tag(s.base);
    const { pre, ref } = (BASE[b] ?? ((sp) => api(sp, 'Component')))(b);
    const ext = ref ? ` extends ${ref}<any>` : '';
    const body = [
      ...MEMBERS[tag(s.members)].map((m) => `  ${m}`),
      '  render() { return <div>{this.props.name}</div>; }',
    ];
    const d = tag(s.decl);
    const head =
      d === 'ClassDecl'
        ? `export class Profile${ext} {`
        : d === 'ClassExpr'
          ? `export const Profile = class${ext} {`
          : `export default class${ext} {`;
    return src(pre, head, body, d === 'ClassExpr' ? '};' : '}');
  },
};
