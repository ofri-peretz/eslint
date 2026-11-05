// Model of eslint-plugin-react-features/react-class-to-hooks.
// Every React class component is reported as a candidate for a function
// component with hooks. A React class component extends React's `Component` or
// `PureComponent`, by binding (named, renamed, `React.Component`, a namespace,
// a computed member); declared, as a class expression, or as an anonymous
// `export default class`. A class extending a `Component` the file declares
// itself or imports from another library, or nothing, is not one.
// An error boundary (`componentDidCatch`, `static getDerivedStateFromError`)
// has no hooks equivalent (React: "There is currently no way to write an error
// boundary as a function component"), so it is never reported.
// `ignorePureRenderComponents` (default false) skips `PureComponent` classes.
// `allowComplexLifecycle` (default false) skips classes using a lifecycle with
// no simple hook mapping: `getDerivedStateFromProps`, `getSnapshotBeforeUpdate`
// (as a method, or under a quoted key).
// Left out: a superclass `Component` the file never declares or imports (the
// module is unknown; the rule keeps reading it by name).
module react_class_to_hooks {
  type Base = Named | Renamed | Default | Namespace | Computed | Pure | Shadowed | Foreign | NoBase
  type Decl = ClassDecl | ClassExpr | DefaultAnon
  type Members = RenderOnly | DerivedState | Snapshot | SnapshotQuoted | DidCatch | DerivedError
  type Opts = Defaults | IgnorePure | AllowComplex

  pure def isReact(b: Base): bool = not(Set(Shadowed, Foreign, NoBase).contains(b))
  pure def boundary(m: Members): bool = Set(DidCatch, DerivedError).contains(m)
  pure def complex(m: Members): bool = Set(DerivedState, Snapshot, SnapshotQuoted).contains(m)
  pure def reports(b: Base, d: Decl, m: Members, o: Opts): bool =
    isReact(b) and not(boundary(m))
      and not(o == IgnorePure and b == Pure)
      and not(o == AllowComplex and complex(m))

  var base: Base
  var decl: Decl
  var members: Members
  var opts: Opts
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Default, Namespace, Computed, Pure, Shadowed, Foreign,
                   NoBase).oneOf()
    nondet d = Set(ClassDecl, ClassExpr, DefaultAnon).oneOf()
    nondet m = Set(RenderOnly, DerivedState, Snapshot, SnapshotQuoted, DidCatch,
                   DerivedError).oneOf()
    nondet o = Set(Defaults, IgnorePure, AllowComplex).oneOf()
    all { base' = b, decl' = d, members' = m, opts' = o, verdict' = reports(b, d, m, o) }
  }

  action init = step
}
