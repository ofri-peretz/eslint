// Model of eslint-plugin-react-features/component-api/no-raw-color-literal (R19).
// No raw colours in component source: a CSS colour in hex (`#fff`,
// `#ff0000`), `rgb()`, `hsl()` or `oklch()` syntax (the CSS Color spec, the
// documented contract) is reported where component source styles things:
//   - a JSX attribute value, however written (`"…"`, `{"…"}`, a template, a
//     conditional), when the value is a colour (`fill="#ff0000"`), and inside a
//     `className` anywhere in the string (`bg-[#ff0000]`);
//   - a value in a `style={{ … }}` object, string or template;
//   - a string argument to a class-name builder, plain, conditional
//     (`flag && "…"`) or a template; the builder is `cn` (the shadcn
//     convention, a local helper) or clsx / classnames / tailwind-merge by
//     import binding, renamed or not.
// Not reported: `var(--token)`, a theme class, a call to another function,
// and text that only contains a `#` and hex digits without being a colour:
// `title="Issue #123"`, an in-page link `href="#add"`.
module no_raw_color_literal {
  type Focus = Values | Builders | Prose
  type Surface = AttrLit | AttrBraced | AttrTmpl | AttrCond | ClassArb | StyleStr | StyleTmpl
               | BuilderLit | BuilderCond | BuilderTmpl
  type Color = Hex6 | Hex3 | Rgb | Hsl | Oklch | Var
  type Builder = Cn | ClsxNamed | ClsxRenamed | ClassnamesDefault | TwMergeNamed | OtherFn
  type ProseKind = NoProse | IssueTitle | FragmentHref

  pure def reports(f: Focus, s: Surface, c: Color, b: Builder, p: ProseKind): bool =
    if (f == Prose) false
    else if (f == Builders) b != OtherFn and c != Var
    else c != Var

  var focus: Focus
  var surface: Surface
  var color: Color
  var builder: Builder
  var prose: ProseKind
  var verdict: bool

  action step = {
    nondet f = Set(Values, Builders, Prose).oneOf()
    nondet s = (if (f == Values)
                  Set(AttrLit, AttrBraced, AttrTmpl, AttrCond, ClassArb, StyleStr, StyleTmpl,
                      BuilderLit, BuilderCond, BuilderTmpl)
                else if (f == Builders) Set(BuilderLit)
                else Set(AttrLit)).oneOf()
    nondet c = (if (f == Values) Set(Hex6, Hex3, Rgb, Hsl, Oklch, Var)
                else if (f == Builders) Set(Hex6, Var)
                else Set(Hex3)).oneOf()
    nondet b = (if (f == Builders) Set(Cn, ClsxNamed, ClsxRenamed, ClassnamesDefault, TwMergeNamed, OtherFn)
                else Set(Cn)).oneOf()
    nondet p = (if (f == Prose) Set(IssueTitle, FragmentHref) else Set(NoProse)).oneOf()
    all { focus' = f, surface' = s, color' = c, builder' = b, prose' = p,
          verdict' = reports(f, s, c, b, p) }
  }

  action init = step
}
