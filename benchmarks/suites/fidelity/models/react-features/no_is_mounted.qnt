// Model of eslint-plugin-react-features/no-is-mounted.
// `isMounted()` is a legacy class-component API React deprecated as an
// anti-pattern (removed for ES6 classes). Reported: a React class component
// calling its own `this.isMounted()` / `this['isMounted']()` anywhere in a
// method, an arrow property or a quoted-key method, directly, under a
// condition, or in a callback that keeps the component's `this`, on a class
// that extends React's `Component` / `PureComponent` (any spelling).
// Not reported: another method call, `store.isMounted()` (another object's
// method), and a class that is not a React component, which may define its
// own `isMounted`; a `this.isMounted` flag the component keeps itself or a
// local variable named `isMounted` (the replacement React's 2015 post
// describes), which are not the API.
// Left out: `isMounted` inside `createReactClass({...})`.
module no_is_mounted {
  type Base = Named | Renamed | Default | Namespace | Pure | Plain | Foreign
  type Where = Direct | InIf | InArrow | InFunction
  type Form = Method_ | ArrowProp | Quoted
  type Call = IsMounted | IsMountedComputed | Other | StoreIsMounted | FlagRead | LocalVar

  pure def isComponent(b: Base): bool = not(Set(Plain, Foreign).contains(b))
  pure def reports(b: Base, c: Call): bool =
    isComponent(b) and Set(IsMounted, IsMountedComputed).contains(c)

  var base: Base
  var where: Where
  var form: Form
  var call: Call
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Pure, Plain, Foreign).oneOf()
    nondet w = Set(Direct, InIf, InArrow, InFunction).oneOf()
    // The base-class spellings are crossed with the plain method and call only.
    nondet f = (if (b == Named) Set(Method_, ArrowProp, Quoted) else Set(Method_)).oneOf()
    nondet c = (if (b == Named) Set(IsMounted, IsMountedComputed, Other, StoreIsMounted, FlagRead,
                                            LocalVar) else Set(IsMounted)).oneOf()
    all { base' = b, where' = w, form' = f, call' = c, verdict' = reports(b, c) }
  }

  action init = step
}
