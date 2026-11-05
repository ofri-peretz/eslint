// Model of eslint-plugin-react-features/display-name.
// React names a component from `Function.name` / `Class.name`; only a
// component with no name to infer renders as `Anonymous` in DevTools and
// component stacks. Reported, when the function renders (JSX, a fragment or
// `React.createElement`):
//   - `export default () => ...` / `export default function () {...}`
//   - an anonymous function given to React's `memo` / `forwardRef` (by
//     binding: named, renamed, default or namespace import) whose result is
//     not bound to a name (`export default memo(...)`, nested wrappers too)
//   - an anonymous class extending React's `Component` / `PureComponent`
//     with no `static displayName`, that is not bound to a name
//     (`export default class extends Component`, `register(class extends ...)`)
// Silent: anything named by a function, class or binding; a wrapper or base
// class that is not React's (a local `memo`, `Component` from another
// library); a function that renders nothing.
// Judgment call (silent, as the doc's "Not a finding" states):
// `const Row = memo(() => <div />)`.
// Left out: undeclared bare `memo` / `Component` (the module is unknown; the
// rule reads them by name).
module display_name {
  type Focus = Fn | Wrap | Cls
  type Shape = DefaultArrow | DefaultFunction | DefaultNamedFunction | ConstArrow
             | WrapUnbound | WrapBound | WrapNamedInner | WrapNested
             | ClassAnonDefault | ClassNamed | ClassExprBound | ClassArg
  type Body = Jsx | Fragment | CreateElement | NoJsx
  type Wrapper = Memo | ForwardRef
  type Spelling = Named | Renamed | Default | Namespace | Shadowed | Foreign | Pure
  type DisplayName = NoDisplayName | StaticDisplayName

  pure def isReact(sp: Spelling): bool = not(Set(Shadowed, Foreign).contains(sp))
  pure def reports(f: Focus, sh: Shape, b: Body, sp: Spelling, d: DisplayName): bool =
    if (f == Fn) Set(DefaultArrow, DefaultFunction).contains(sh) and b != NoJsx
    else if (f == Wrap) isReact(sp) and Set(WrapUnbound, WrapNested).contains(sh) and b != NoJsx
    else isReact(sp) and d == NoDisplayName and Set(ClassAnonDefault, ClassArg).contains(sh)

  var focus: Focus
  var shape: Shape
  var body: Body
  var wrapper: Wrapper
  var spelling: Spelling
  var displayName: DisplayName
  var verdict: bool

  action step = {
    nondet f = Set(Fn, Wrap, Cls).oneOf()
    nondet sh = (if (f == Fn) Set(DefaultArrow, DefaultFunction, DefaultNamedFunction, ConstArrow)
                 else if (f == Wrap) Set(WrapUnbound, WrapBound, WrapNamedInner, WrapNested)
                 else Set(ClassAnonDefault, ClassNamed, ClassExprBound, ClassArg)).oneOf()
    nondet b = (if (f == Fn) Set(Jsx, Fragment, CreateElement, NoJsx)
                else if (f == Wrap) Set(Jsx, CreateElement, NoJsx)
                else Set(Jsx)).oneOf()
    nondet w = (if (f == Wrap) Set(Memo, ForwardRef) else Set(Memo)).oneOf()
    nondet sp = (if (f == Wrap) Set(Named, Renamed, Default, Namespace, Shadowed, Foreign)
                 else if (f == Cls) Set(Named, Renamed, Default, Namespace, Shadowed, Foreign, Pure)
                 else Set(Named)).oneOf()
    nondet d = (if (f == Cls) Set(NoDisplayName, StaticDisplayName) else Set(NoDisplayName)).oneOf()
    all { focus' = f, shape' = sh, body' = b, wrapper' = w, spelling' = sp, displayName' = d,
          verdict' = reports(f, sh, b, sp, d) }
  }

  action init = step
}
