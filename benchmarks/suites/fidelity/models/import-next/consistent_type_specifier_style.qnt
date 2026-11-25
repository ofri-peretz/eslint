// Model of eslint-plugin-import-next/consistent-type-specifier-style.
// A user-configured convention, taken as given. With no options the rule is
// `prefer-top-level`, as in eslint-plugin-import 2.32.0 (its schema says
// `prefer-inline`, its code does not). `prefer-inline` reports a top-level
// `import type { A }` with named specifiers (`import { type A }` is the
// preferred spelling); a type-only default or namespace import has no inline
// form and is silent. `prefer-top-level` reports any inline `type` specifier (`import { type A }`, also next to a
// value specifier or a default binding: the convention is that type
// qualifiers sit on the statement).
module consistent_type_specifier_style {
  type Decl = TopNamed | TopNamedRenamed | TopDefault | TopNamespace | InlineAll | InlineMixed | DefaultInline | ValueOnly
  type Style = Default | PreferInline | PreferTopLevel

  pure def reports(d: Decl, s: Style): bool =
    if (s == PreferInline) Set(TopNamed, TopNamedRenamed).contains(d)
    else Set(InlineAll, InlineMixed, DefaultInline).contains(d)

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
