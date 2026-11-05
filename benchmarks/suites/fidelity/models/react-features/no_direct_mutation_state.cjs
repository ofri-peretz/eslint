const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE } = require('../../react.cjs');
const { classModule } = require('../../react-b.cjs');

const MUTATION = {
  AssignKey: 'this.state.count = 1;',
  Compound: 'this.state.count += 1;',
  Update: 'this.state.count++;',
  Delete: 'delete this.state.count;',
  Nested: "this.state.user.name = 'x';",
  ComputedState: "this['state'].count = 1;",
  ReplaceState: 'this.state = { count: 1, user: { name: "" } };',
  Read: 'const c = this.state.count;',
  SetState: 'this.setState({ count: 1 });',
};

function members(where, stmt) {
  const ctor = [
    'constructor(props: any) {',
    '  super(props);',
    '  this.state = { count: 0, user: { name: "" } };',
    ...(where === 'Constructor' ? [`  ${stmt}`] : []),
    '}',
  ];
  const place = {
    Constructor: [],
    Handler: ['handleClick = () => {', `  ${stmt}`, '};'],
    Method_: ['increment() {', `  ${stmt}`, '}'],
    Lifecycle: ['componentDidMount() {', `  ${stmt}`, '}'],
    Callback: [
      'handleClick = () => {',
      '  load().then(() => {',
      `    ${stmt}`,
      '  });',
      '};',
    ],
  }[where];
  return [
    'state: any;',
    ...ctor,
    ...place,
    'render() {',
    '  return null;',
    '}',
  ].join('\n');
}

module.exports = {
  rule: 'no-direct-mutation-state',
  // Named base: 9 statements x 5 places x 2 options; 6 other bases: 1.
  domain: 9 * 5 * 2 + 6,
  traces: 2500,
  filename: FILE,
  key: keyOf('base', 'mutation', 'where', 'opt'),
  config: (s) =>
    tag(s.opt) === 'AllowInLifecycle'
      ? { allowInLifecycleMethods: true }
      : undefined,
  code: (s) =>
    classModule(tag(s.base), members(tag(s.where), MUTATION[tag(s.mutation)]), {
      pre: ['declare function load(): Promise<void>;'],
    }),
};
