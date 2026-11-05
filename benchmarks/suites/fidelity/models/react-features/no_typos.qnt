// Model of eslint-plugin-react-features/no-typos.
// React calls a class component's lifecycles and reads its statics by exact
// name, so a member that spells one of them with different letter case
// (`ComponentDidMount`, `static PropTypes`, `App.DefaultProps = …`) or with
// one of the documented misspellings (`componenDidMount`, `defaulProps`) is
// silently ignored and reported. Also reported: a lifecycle React calls on
// the instance declared `static`, and `getDerivedStateFromProps` declared on
// the instance (React calls only the static one). The exact names, an
// unrelated member, and reading a static (`App.propTypes`,
// `PropTypes.string`) are silent, and so is any class that is not a React
// component (by binding).
// Left out: statics assigned to a function component (whether a function is
// a component is not decided by this rule), and a class extending an
// undeclared bare `Component`.
module no_typos {
  type Member = LcExact | LcCase | LcList | LcStatic | GdsfpStatic | GdsfpInstance | PropExact
              | PropCase | PropList | AssignExact | AssignCase | Unrelated | ReadStatic
  type Super = Default | Named | Renamed | Namespace | Foreign | NoSuper

  pure def isReact(s: Super): bool = Set(Default, Named, Renamed, Namespace).contains(s)
  pure def typo(m: Member): bool =
    Set(LcCase, LcList, LcStatic, GdsfpInstance, PropCase, PropList, AssignCase).contains(m)
  pure def reports(m: Member, s: Super): bool = isReact(s) and typo(m)

  var member: Member
  var sup: Super
  var verdict: bool

  action step = {
    nondet m = Set(LcExact, LcCase, LcList, LcStatic, GdsfpStatic, GdsfpInstance, PropExact,
                   PropCase, PropList, AssignExact, AssignCase, Unrelated, ReadStatic).oneOf()
    nondet s = Set(Default, Named, Renamed, Namespace, Foreign, NoSuper).oneOf()
    all { member' = m, sup' = s, verdict' = reports(m, s) }
  }

  action init = step
}
