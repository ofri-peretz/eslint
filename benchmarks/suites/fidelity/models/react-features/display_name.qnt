// Model of eslint-plugin-react-features/display-name.
// React names a component from `Function.name` / `Class.name`; only a
// component with no name to infer renders as `Anonymous` in DevTools and
// component stacks. Reported:
//   - `export default () => ...` / `export default function () {...}` that
//     renders (JSX, a fragment or `React.createElement`)
//   - an anonymous function given to React's `memo` / `forwardRef` (by
//     binding: named, renamed, default or namespace import), WHETHER OR NOT the
//     result is bound to a name and whatever the function returns: the binding
//     does not name the function inside the call (`const Row = memo(() => ...)`
//     is `Anonymous`). eslint-plugin-react 7.37.5 reports these
//     (tests/lib/rules/display-name.js, invalid cases ~1033-1066).
//   - an anonymous class extending React's `Component` / `PureComponent`
//     with no `static displayName`, that is not bound to a name
//     (`export default class extends Component`, `register(class extends ...)`)
// Silent: anything named by a function, class or binding; a wrapper or base
// class that is not React's (a local `memo`, `Component` from another
// library); a wrapper holding a function expression with its own name; a
// `memo(forwardRef(...))` chain, which one component names on the React
// versions the fidelity inputs run under (no `settings.react.version`, so the
// latest): valid cases 638-724 and invalid cases ~1068-1135 of the same file
// fix the version range (`^0.14.10 || ^15.7.0 || >= 16.12.0`).
// Wrapped functions that render nothing are reported, as 7.37.5 does when run
// (no upstream test covers it).
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
    else if (f == Wrap) isReact(sp) and Set(WrapUnbound, WrapBound).contains(sh)
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
