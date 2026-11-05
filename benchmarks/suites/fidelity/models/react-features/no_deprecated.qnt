// Model of eslint-plugin-react-features/no-deprecated.
// Reported: React APIs that React itself deprecated or removed —
//   - react-dom `render`, `hydrate`, `unmountComponentAtNode`, `findDOMNode`
//     (deprecated in 18, removed in 19), and react's `createClass` and
//     `PropTypes` (removed in 16), used through any spelling of the module
//     (named, renamed, default / namespace / computed member, the UMD global);
//   - the legacy lifecycle names `componentWillMount`,
//     `componentWillReceiveProps`, `componentWillUpdate` (renamed to
//     `UNSAFE_*` in 16.3) declared as a method, an arrow property or a quoted
//     key on a class that extends React's `Component` / `PureComponent`.
// Not reported (safe twins): `createRoot` from `react-dom/client` and
// `createElement`; the same names on a local object or a local function, or
// imported from another module; `componentDidMount`; the lifecycle names on a
// class that is not a React component (no base class, or a `Component`
// imported from another library).
// Left out: a bare `render(...)` the file never declares or imports (the
// module is unknown). Left out (judgment): `UNSAFE_*` lifecycles, which React
// keeps as the supported legacy spelling (no-unsafe covers them).
module no_deprecated {
  type Focus = Apis | Lifecycles
  type Api = Render | Hydrate | Unmount | FindDomNode | CreateClass | PropTypes_
           | CreateRoot | CreateElement
  type Spelling = Named | Renamed | Default | Namespace | Computed | Umd | Shadowed
                | LocalObject | Foreign
  type Method = WillMount | WillReceiveProps | WillUpdate | DidMount
  type Base = BNamed | BRenamed | BDefault | BNamespace | BPure | BPlain | BForeign
  type Form = Method_ | ArrowProp | Quoted

  pure def deprecatedApi(a: Api): bool = not(Set(CreateRoot, CreateElement).contains(a))
  pure def isReact(s: Spelling): bool = not(Set(Shadowed, LocalObject, Foreign).contains(s))
  pure def isComponent(b: Base): bool = not(Set(BPlain, BForeign).contains(b))
  pure def reports(fo: Focus, a: Api, s: Spelling, m: Method, b: Base): bool =
    if (fo == Apis) deprecatedApi(a) and isReact(s)
    else m != DidMount and isComponent(b)

  var focus: Focus
  var api: Api
  var spelling: Spelling
  var method: Method
  var base: Base
  var form: Form
  var verdict: bool

  action step = {
    nondet fo = Set(Apis, Lifecycles).oneOf()
    nondet a = (if (fo == Apis) Set(Render, Hydrate, Unmount, FindDomNode, CreateClass,
                                    PropTypes_, CreateRoot, CreateElement)
                else Set(Render)).oneOf()
    nondet s = (if (fo == Apis) Set(Named, Renamed, Default, Namespace, Computed, Umd,
                                    Shadowed, LocalObject, Foreign)
                else Set(Named)).oneOf()
    nondet m = (if (fo == Lifecycles) Set(WillMount, WillReceiveProps, WillUpdate, DidMount)
                else Set(DidMount)).oneOf()
    nondet b = (if (fo == Lifecycles) Set(BNamed, BRenamed, BDefault, BNamespace, BPure,
                                          BPlain, BForeign)
                else Set(BNamed)).oneOf()
    nondet f = (if (fo == Lifecycles) Set(Method_, ArrowProp, Quoted) else Set(Method_)).oneOf()
    all { focus' = fo, api' = a, spelling' = s, method' = m, base' = b, form' = f,
          verdict' = reports(fo, a, s, m, b) }
  }

  action init = step
}
