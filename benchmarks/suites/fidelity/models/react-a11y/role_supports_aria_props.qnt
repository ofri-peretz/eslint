// Model of eslint-plugin-react-a11y/role-supports-aria-props (WCAG 4.1.2).
// WAI-ARIA 1.2 §5.2.6: an aria-* state or property is meaningful only on a
// role that supports it (global properties are supported everywhere). The role
// is the explicit `role`, else the element's implicit role (HTML-AAM / ARIA
// in HTML). Supported, per WAI-ARIA 1.2 role definitions:
//   button   -> aria-expanded, aria-pressed
//   checkbox -> aria-checked, aria-expanded
//   slider   -> aria-valuenow
//   link     -> aria-expanded
//   heading  -> aria-level
// An element with no role at all (a bare div) is left to judgment: silent. An
// unknown (dynamic) role cannot be checked, and a member-expression component
// is not DOM.
// left out: candidate for change (fires on a guess): a plain component
// (`<Widget role="button" aria-checked>`) whose DOM is unknown.
module role_supports_aria_props {
  type Ctx = DivButton | DivCheckbox | DivSlider | AnchorHref | NativeCheckbox | NativeButton
           | H1 | DivNoRole | Member
  type Prop = AriaLabel | AriaHidden | AriaChecked | AriaPressed | AriaExpanded | AriaValuenow
            | AriaLevel
  type Spelling = Lit | Braced | Dynamic

  pure def supports(c: Ctx, p: Prop): bool =
    Set(AriaLabel, AriaHidden).contains(p)
    or (Set(DivButton, NativeButton).contains(c) and Set(AriaExpanded, AriaPressed).contains(p))
    or (Set(DivCheckbox, NativeCheckbox).contains(c) and Set(AriaChecked, AriaExpanded).contains(p))
    or (c == DivSlider and p == AriaValuenow)
    or (c == AnchorHref and p == AriaExpanded)
    or (c == H1 and p == AriaLevel)
  pure def checkable(c: Ctx, sp: Spelling): bool =
    not(Set(DivNoRole, Member).contains(c)) and sp != Dynamic
  pure def explicitRole(c: Ctx): bool = Set(DivButton, DivCheckbox, DivSlider).contains(c)

  var ctx: Ctx
  var prop: Prop
  var spelling: Spelling
  var verdict: bool

  action step = {
    nondet c = Set(DivButton, DivCheckbox, DivSlider, AnchorHref, NativeCheckbox, NativeButton,
                   H1, DivNoRole, Member).oneOf()
    nondet p = Set(AriaLabel, AriaHidden, AriaChecked, AriaPressed, AriaExpanded,
                   AriaValuenow, AriaLevel).oneOf()
    nondet sp = (if (explicitRole(c)) Set(Lit, Braced, Dynamic) else Set(Lit)).oneOf()
    all { ctx' = c, prop' = p, spelling' = sp,
          verdict' = (checkable(c, sp) and not(supports(c, p))) }
  }

  action init = step
}
