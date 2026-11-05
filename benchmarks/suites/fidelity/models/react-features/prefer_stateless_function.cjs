const { tag } = require('../../lib.cjs');
const { keyOf } = require('../../quality.cjs');
const { FILE, src } = require('../../react.cjs');
const { SUPER } = require('../../react-c.cjs');

const RENDER = '  render() { return <h1>Hello, {this.props.name}</h1>; }';
const BODY = {
  RenderOnly: [RENDER],
  StaticProps: [
    '  static propTypes = {};',
    "  static displayName = 'Greeting';",
    RENDER,
  ],
  ContextUse: ['  render() { return <h1>{this.context.greeting}</h1>; }'],
  UselessCtor: ['  constructor(props: any) { super(props); }', RENDER],
  StateField: ['  state = { count: 0 };', RENDER],
  SetState: [
    '  render() { return <button onClick={() => this.setState({ on: true })}>On</button>; }',
  ],
  Lifecycle: ['  componentDidMount() { this.props.onReady(); }', RENDER],
  ArrowLifecycle: [
    '  componentDidMount = () => { this.props.onReady(); };',
    RENDER,
  ],
  Handler: [
    '  handleClick() { this.props.onPick(this.props.name); }',
    '  render() { return <button onClick={() => this.handleClick()}>Pick</button>; }',
  ],
  RefField: [
    '  input: any = null;',
    '  render() { return <input ref={(el) => { this.input = el; }} />; }',
  ],
  ErrorBoundary: [
    '  static getDerivedStateFromError() { return null; }',
    RENDER,
  ],
};

module.exports = {
  rule: 'prefer-stateless-function',
  domain: 11 * 6 * 2 * 2,
  traces: 1800,
  filename: FILE,
  key: keyOf('body', 'sup', 'classForm', 'opt'),
  config: (s) =>
    tag(s.opt) === 'IgnorePure' ? { ignorePureComponents: true } : undefined,
  code: (s) => {
    const { pre, ext } = SUPER[tag(s.sup)];
    let body = BODY[tag(s.body)];
    if (tag(s.sup) === 'NoSuper')
      body = body.map((l) => l.replace(' super(props); ', ' '));
    const decl = tag(s.classForm) === 'Decl';
    return src(
      pre,
      decl ? `export class App${ext} {` : `export const App = class${ext} {`,
      '  [k: string]: any;',
      body,
      decl ? '}' : '};',
    );
  },
};
