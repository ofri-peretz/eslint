// Model of eslint-plugin-react-features/jsx-pascal-case.
// A user-defined JSX component is named in PascalCase. Not checked: an
// intrinsic element (`<div />`) and a one-letter name (`<T />`). Reported: a
// name that is not PascalCase, unless an option accepts it:
//   allowAllCaps           `MY_COMP`
//   allowLeadingUnderscore `_MyComp`
//   allowNamespace         judge only the first part of `Ui.card`
//   ignore                 the offending part is listed by name
module jsx_pascal_case {
  type Tag = Intrinsic | Pascal | OneLetter | MixedUnderscore | AllCaps | LeadingUnderscore | MemberPascal | MemberLower

  // Is the tag a problem with every option off?
  pure def bad(t: Tag): bool =
    Set(MixedUnderscore, AllCaps, LeadingUnderscore, MemberLower).contains(t)

  // Does an option that is on accept the tag?
  pure def accepted(t: Tag, caps: bool, under: bool, ns: bool, ign: bool): bool =
    ign or
    (t == AllCaps and caps) or
    (t == LeadingUnderscore and under) or
    (t == MemberLower and ns)

  pure def reports(t: Tag, caps: bool, under: bool, ns: bool, ign: bool): bool =
    bad(t) and not(accepted(t, caps, under, ns, ign))

  var tagKind: Tag
  var allowAllCaps: bool
  var allowLeadingUnderscore: bool
  var allowNamespace: bool
  var ignored: bool
  var verdict: bool

  action step = {
    nondet t = Set(Intrinsic, Pascal, OneLetter, MixedUnderscore, AllCaps, LeadingUnderscore, MemberPascal, MemberLower).oneOf()
    nondet c = Set(true, false).oneOf()
    nondet u = Set(true, false).oneOf()
    nondet n = Set(true, false).oneOf()
    nondet i = Set(true, false).oneOf()
    all {
      tagKind' = t, allowAllCaps' = c, allowLeadingUnderscore' = u,
      allowNamespace' = n, ignored' = i, verdict' = reports(t, c, u, n, i)
    }
  }

  action init = step
}
