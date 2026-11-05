// Model of eslint-plugin-react-features/component-api/no-arbitrary-token-class (R19).
// No arbitrary Tailwind value where the theme has a token: a spacing / radius
// utility (`p*`, `m*` incl. negative `-m*`, `gap*`, `space-x/y`, `rounded*`:
// the documented set, Tailwind's own utility names) with a bracketed length in
// px / rem / em (`px-[18px]`, `gap-[1.5rem]`, `p-[.5rem]`). Reported in a
// `className` however written (`"…"`, `{"…"}`, a template, a conditional) and
// in a class-name builder argument (plain, conditional, an object key, an
// array element), with any variant prefix (`hover:`, `md:`, `!`,
// `data-[state=open]:`). The builder is `cn` (a local helper by convention) or
// clsx / classnames / tailwind-merge by import binding, renamed or not.
// Not reported: `var(--token)`, `calc(…)`, a viewport or percentage length,
// a utility outside the set (`text-[14px]`, `w-[18px]`), another function.
module no_arbitrary_token_class {
  type Focus = Spell | Util | Mods | Builders
  type Surface = Lit | Braced | Tmpl | TmplExpr | Cond | BLit | BCond | BObjKey | BArray
  type Utility = Px | Rounded | NegMx | Gap | SpaceX | Text | W
  type Value = VPx | VRem | VEm | VDotRem | VVar | VCalc | VVh
  type Modifier = NoVariant | Hover | Md | Important | DataState
  type Builder = Cn | ClsxNamed | ClsxRenamed | ClassnamesDefault | TwMergeNamed | OtherFn

  pure def tokenUtil(u: Utility): bool = not(Set(Text, W).contains(u))
  pure def tokenValue(v: Value): bool = Set(VPx, VRem, VEm, VDotRem).contains(v)
  pure def reports(s: Surface, u: Utility, v: Value, b: Builder): bool =
    tokenUtil(u) and tokenValue(v) and b != OtherFn

  var focus: Focus
  var surface: Surface
  var utility: Utility
  var value: Value
  var modifier: Modifier
  var builder: Builder
  var verdict: bool

  action step = {
    nondet f = Set(Spell, Util, Mods, Builders).oneOf()
    nondet s = (if (f == Spell) Set(Lit, Braced, Tmpl, TmplExpr, Cond, BLit, BCond, BObjKey, BArray)
                else if (f == Builders) Set(BLit)
                else Set(Lit)).oneOf()
    nondet u = (if (f == Util) Set(Px, Rounded, NegMx, Gap, SpaceX, Text, W) else Set(Px)).oneOf()
    nondet v = (if (f == Util) Set(VPx, VRem, VEm, VDotRem, VVar, VCalc, VVh)
                else if (f == Spell) Set(VPx, VVar)
                else Set(VPx)).oneOf()
    nondet va = (if (f == Mods) Set(Hover, Md, Important, DataState) else Set(NoVariant)).oneOf()
    nondet b = (if (f == Builders) Set(Cn, ClsxNamed, ClsxRenamed, ClassnamesDefault, TwMergeNamed, OtherFn)
                else Set(Cn)).oneOf()
    all { focus' = f, surface' = s, utility' = u, value' = v, modifier' = va, builder' = b,
          verdict' = reports(s, u, v, b) }
  }

  action init = step
}
