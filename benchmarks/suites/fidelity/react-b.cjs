/**
 * Class-component helpers for the react-features models
 * (`models/react-features/`), on top of `react.cjs`.
 *
 * Lives outside `models/` because the runner treats every `.cjs` there as a
 * model.
 */
const { api, indent } = require('./react.cjs');

/**
 * How a class names its React base class.
 *
 *   - `Named`      `class extends Component` (imported)
 *   - `Renamed`    `class extends ComponentAlias`
 *   - `Default`    `class extends React.Component`
 *   - `Namespace`  `class extends R.Component`
 *   - `Pure`       `class extends React.PureComponent`
 *   - `Plain`      a class that extends nothing: not a component
 *   - `Foreign`    `class extends Component` imported from another module
 */
function base(spelling) {
  switch (spelling) {
    case 'Pure':
      return api('Default', 'PureComponent');
    case 'Plain':
      return { pre: [], ref: null };
    default:
      return api(spelling, 'Component');
  }
}

/**
 * A module with `export class App extends <base> { body }`. `body` is the
 * class body source; `pre` adds module-level lines after the imports.
 */
function classModule(spelling, body, { pre = [], name = 'App' } = {}) {
  const b = base(spelling);
  const ext = b.ref ? ` extends ${b.ref}` : '';
  return [
    ...b.pre,
    ...pre,
    `export class ${name}${ext} {`,
    indent(body, 2),
    '}',
    '',
  ].join('\n');
}

module.exports = { base, classModule };

/**
 * A class whose lifecycle method `method` makes one call, placed by `where`:
 *
 *   - `Direct`      `this.setState({ a: 1 });` at the top of the method
 *   - `InIf`        inside `if (prev.id !== this.props.id) { … }`
 *   - `InLogical`   `prev.id !== this.props.id && this.setState(…)`
 *   - `InArrow`     inside `load().then(() => { … })`
 *   - `InFunction`  inside `setTimeout(function () { … }.bind(this))`
 *
 * `form` declares the method as `Method_` (`m() {}`), `ArrowProp`
 * (`m = () => {}`) or `Quoted` (`'m'() {}`). `call` is `SetState`
 * (`this.setState`), `Computed` (`this['setState']`), `Other`
 * (`this.update`) or `Store` (`store.setState`, another object's); and the
 * same for `isMounted` (`IsMounted`, `IsMountedComputed`, `StoreIsMounted`,
 * and two things merely named `isMounted`: `FlagRead`, a `this.isMounted`
 * flag read, and `LocalVar`, a local `const isMounted`).
 */
const CALL = {
  SetState: 'this.setState({ a: 1 })',
  Computed: "this['setState']({ a: 1 })",
  Other: 'this.update({ a: 1 })',
  Store: 'store.setState({ a: 1 })',
  IsMounted: 'this.isMounted()',
  IsMountedComputed: "this['isMounted']()",
  StoreIsMounted: 'store.isMounted()',
  FlagRead: 'if (this.isMounted) this.update({ a: 1 })',
  LocalVar: 'const isMounted = { current: true }',
};
function lifecycleCall(spelling, method, { where, form, call }) {
  const c = CALL[call];
  const body = {
    Direct: [`${c};`],
    InIf: ['if (prev.id !== this.props.id) {', `  ${c};`, '}'],
    InLogical: [`prev.id !== this.props.id && ${c};`],
    InArrow: ['load().then(() => {', `  ${c};`, '});'],
    InFunction: [
      'setTimeout(function (this: any) {',
      `  ${c};`,
      '}.bind(this));',
    ],
  }[where].map((l) => `  ${l}`);
  const head = {
    Method_: [`${method}(prev: any) {`],
    ArrowProp: [`${method} = (prev: any) => {`],
    Quoted: [`'${method}'(prev: any) {`],
  }[form];
  const tail = form === 'ArrowProp' ? '};' : '}';
  return classModule(
    spelling,
    [
      'props: any;',
      ...head,
      ...body,
      tail,
      'render() {',
      '  return null;',
      '}',
    ].join('\n'),
    {
      pre: [
        'declare function load(): Promise<void>;',
        'declare const store: any;',
      ],
    },
  );
}

module.exports.lifecycleCall = lifecycleCall;
