// Model of eslint-plugin-react-features/component-api/no-default-test-id (R5).
// `data-testid` is the consumer's selector: a component must not give it a
// runtime default. Reported: a destructuring default on the `data-testid` key,
// however the key is spelled (quoted, computed, a no-placeholder template),
// in the props parameter or in a destructure of props in the body. Not a
// default: `= undefined` (the prop stays absent). A different key
// (`data-slot`, the camelCase `dataTestId`, which is another prop) is out of
// scope.
module no_default_test_id {
  type Key = Quoted | Computed | Template | OtherKey | Camel
  type Default = Str | Tmpl | Ident | Undef | NoDefault
  type Site = Param | Body

  pure def reports(k: Key, d: Default, s: Site): bool =
    Set(Quoted, Computed, Template).contains(k) and Set(Str, Tmpl, Ident).contains(d)

  var key: Key
  var dflt: Default
  var site: Site
  var verdict: bool

  action step = {
    nondet k = Set(Quoted, Computed, Template, OtherKey, Camel).oneOf()
    nondet d = Set(Str, Tmpl, Ident, Undef, NoDefault).oneOf()
    nondet s = Set(Param, Body).oneOf()
    all { key' = k, dflt' = d, site' = s, verdict' = reports(k, d, s) }
  }

  action init = step
}
