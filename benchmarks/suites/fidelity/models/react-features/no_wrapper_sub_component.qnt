// Model of eslint-plugin-react-features/component-api/no-wrapper-sub-component (R12).
// A pure passthrough wrapper: a component (PascalCase, React's own rule) whose
// whole body renders one component element with the props spread on it and
// nothing else. Reported in every way a function component is written: a
// declaration, `export default function`, an arrow with an expression or a
// block body, a function expression, and wrapped in `memo` (by binding);
// with the props taken whole (`props`) or as one rest element (`{ ...rest }`),
// and a component or member target (`<Button>`, `<Dialog.Trigger>`).
// Not reported: a host element target (`<button>` is the primitive), an extra
// attribute or children (structural behaviour), a spread of something other
// than the props (`{...defaults}` ignores the props), props destructured with
// a named prop the wrapper drops (`{ label, ...rest }` filters the props),
// and a lowercase function (not a component).
module no_wrapper_sub_component {
  type Form = FnDecl | ExportDefaultFn | ArrowExpr | ArrowBlock | FnExpr | MemoArrow | LowerFn
  type Params = Props | RestOnly | DestructDrop
  type Target = Comp | Member | Intrinsic
  type Extra = NoExtra | Attr | Children | OtherSpread

  pure def reports(f: Form, p: Params, t: Target, e: Extra): bool =
    f != LowerFn and Set(Props, RestOnly).contains(p) and t != Intrinsic and e == NoExtra

  var form: Form
  var params: Params
  var target: Target
  var extra: Extra
  var verdict: bool

  action step = {
    nondet f = Set(FnDecl, ExportDefaultFn, ArrowExpr, ArrowBlock, FnExpr, MemoArrow, LowerFn).oneOf()
    nondet p = Set(Props, RestOnly, DestructDrop).oneOf()
    nondet t = Set(Comp, Member, Intrinsic).oneOf()
    nondet e = Set(NoExtra, Attr, Children, OtherSpread).oneOf()
    all { form' = f, params' = p, target' = t, extra' = e, verdict' = reports(f, p, t, e) }
  }

  action init = step
}
