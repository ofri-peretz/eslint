// Model of eslint-plugin-import-next/consistent-type-specifier-style.
// A user-configured convention, taken as given. `prefer-inline` (the
// default) reports a top-level `import type { A }` with named specifiers
// (`import { type A }` is the preferred spelling); a type-only default or
// namespace import has no inline form and is silent. `prefer-top-level`
// reports any inline `type` specifier (`import { type A }`, also next to a
// value specifier or a default binding: the convention is that type
// qualifiers sit on the statement).
module consistent_type_specifier_style {
  type Decl = TopNamed | TopNamedRenamed | TopDefault | TopNamespace | InlineAll | InlineMixed | DefaultInline | ValueOnly
  type Style = Default | PreferInline | PreferTopLevel

  pure def reports(d: Decl, s: Style): bool =
    if (s == PreferTopLevel) Set(InlineAll, InlineMixed, DefaultInline).contains(d)
    else Set(TopNamed, TopNamedRenamed).contains(d)

  var decl: Decl
  var style: Style
  var verdict: bool

  action step = {
    nondet d = Set(TopNamed, TopNamedRenamed, TopDefault, TopNamespace, InlineAll, InlineMixed, DefaultInline, ValueOnly).oneOf()
    nondet s = Set(Default, PreferInline, PreferTopLevel).oneOf()
    all { decl' = d, style' = s, verdict' = reports(d, s) }
  }

  action init = step
}
