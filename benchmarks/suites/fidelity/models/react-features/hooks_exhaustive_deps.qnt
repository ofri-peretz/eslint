// Model of eslint-plugin-react-features/hooks-exhaustive-deps.
// React's dependency contract for useEffect / useLayoutEffect / useCallback /
// useMemo / useImperativeHandle: every reactive value the callback reads (a
// prop, state, a value computed during render) must be listed. Not reactive,
// so never missing: a useState / useReducer setter and a useRef object (by
// binding, also through a renamed `useState` import), module constants, the
// callback's own parameters. A dependency listed as a member path
// (`[props.label]`) covers the callback's `props.label`. A deps argument that
// is not an array literal cannot be checked and is reported; no deps argument
// is not judged. An unused dependency is reported for useCallback / useMemo
// (it only invalidates the memo); for an effect only when it is not reactive
// (a module constant: changing it never re-renders), because listing a
// reactive value to re-run the effect on its change is the documented pattern. The callback is the
// hook's function argument: the second one for useImperativeHandle. The hook
// is React's by binding (named, renamed, default / namespace / computed
// member); a local `useEffect` or one from another module is not React's.
// `additionalHooks` adds hooks checked like useEffect;
// `enableDangerousAutofixThisMayCauseInfiniteLoops` changes no verdict.
// Judgment call (silent): a callback passed by reference (`useEffect(fn, [])`).
// Left out: an undeclared bare `useEffect` (module unknown; read by name).
module hooks_exhaustive_deps {
  type Focus = Spellings | Deps | Option
  type Hook = UseEffect | UseLayoutEffect | UseCallback | UseMemo | UseImperativeHandle | Custom
  type Spelling = Named | Renamed | Default | Namespace | Computed | Shadowed | Foreign
  type DepCase = PropMissing | PropListed | StateMissing | SetterMissing | SetterRenamedMissing
               | RefMissing | ModuleConstMissing | UpperLocalMissing | ParamUsed | ExtraUnused | ExtraConst
               | NonArray | NoDeps | MemberDepListed
  type Opt = OptDefault | OptSet | OptDangerous

  pure def isReact(sp: Spelling): bool = not(Set(Shadowed, Foreign).contains(sp))
  pure def isEffect(h: Hook): bool = Set(UseEffect, UseLayoutEffect, Custom).contains(h)
  pure def depReports(h: Hook, d: DepCase): bool =
    Set(PropMissing, StateMissing, UpperLocalMissing, NonArray, ExtraConst).contains(d)
      or (d == ExtraUnused and not(isEffect(h)))
  pure def reports(f: Focus, h: Hook, sp: Spelling, d: DepCase, o: Opt): bool =
    if (f == Option) (o == OptSet or h != Custom) and d == PropMissing
    else isReact(sp) and depReports(h, d)

  var focus: Focus
  var hook: Hook
  var spelling: Spelling
  var depCase: DepCase
  var opt: Opt
  var verdict: bool

  action step = {
    nondet f = Set(Spellings, Deps, Option).oneOf()
    nondet h = (if (f == Spellings) Set(UseEffect, UseLayoutEffect, UseCallback, UseMemo, UseImperativeHandle)
                else if (f == Deps) Set(UseEffect, UseCallback, UseMemo)
                else Set(Custom, UseEffect)).oneOf()
    nondet sp = (if (f == Spellings) Set(Named, Renamed, Default, Namespace, Computed, Shadowed, Foreign)
                 else Set(Named)).oneOf()
    nondet d = (if (f == Deps) Set(PropMissing, PropListed, StateMissing, SetterMissing, SetterRenamedMissing,
                                   RefMissing, ModuleConstMissing, UpperLocalMissing, ParamUsed, ExtraUnused, ExtraConst,
                                   NonArray, NoDeps, MemberDepListed)
                else Set(PropMissing, PropListed)).oneOf()
    nondet o = (if (f == Option) Set(OptDefault, OptSet, OptDangerous) else Set(OptDefault)).oneOf()
    all { focus' = f, hook' = h, spelling' = sp, depCase' = d, opt' = o,
          verdict' = reports(f, h, sp, d, o) }
  }

  action init = step
}
