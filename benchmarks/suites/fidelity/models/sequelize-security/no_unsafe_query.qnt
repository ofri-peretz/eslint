// Model of eslint-plugin-sequelize-security/no-unsafe-query (CWE-89).
// A value spliced into SQL text by template interpolation or `+` (directly,
// through a variable, or `+=`) reaches the database unescaped. The sinks are
// `sequelize.query()` (also as `sequelize['query']`) and `literal()` — static
// `Sequelize.literal`, the named `literal` import, or the instance's — which
// splices its argument verbatim into a builder query. In a VALUE position any
// value the file cannot prove fixed is reported, a handler parameter
// included; in a FRAGMENT position (an ORDER BY target) only request data is;
// request data handed over as the whole text is always reported, and
// `replacements` passed beside an interpolated value do not repair it. Safe:
// named or positional `replacements`, `bind` parameters, a `?` placeholder
// list, `sequelize.escape()`, a constant, a number, an allowlist lookup or an
// anchored-regex check, a ternary between two literals, a plain literal.
// `literal()` takes no bindings. Files with no Sequelize import are not
// judged, and neither are test files.
module no_unsafe_query {
  type Site =
    | Named | Default | Require | Renamed | Typescript | NoImport | Bracket
    | InTest | LiteralStatic | LiteralNamed | LiteralInstance
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | PlusAssign | IndirectConcat
    | StringCast | ReplacementsButInterpolated | FragmentReq | WholeReq
    | ConstTemplate | NumberTemplate | Literal | Replacements
    | ReplacementsArray | BindParam | Placeholders | Escaped
    | FragmentParam | AllowlistMap | RegexChecked | TernaryLiteral

  pure def unsafe(s: Shape): bool = Set(
    TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
    StringCast, ReplacementsButInterpolated, FragmentReq, WholeReq,
  ).contains(s)

  pure def bound(s: Shape): bool = Set(
    ReplacementsButInterpolated, Replacements, ReplacementsArray, BindParam,
    Placeholders,
  ).contains(s)

  pure def isLiteral(site: Site): bool =
    Set(LiteralStatic, LiteralNamed, LiteralInstance).contains(site)

  pure def applies(site: Site, s: Shape): bool =
    not(isLiteral(site) and bound(s))

  pure def judged(site: Site): bool = site != NoImport and site != InTest

  pure def reports(site: Site, s: Shape): bool = judged(site) and unsafe(s)

  var site: Site
  var shape: Shape
  var verdict: bool

  action step = {
    nondet st = Set(
      Named, Default, Require, Renamed, Typescript, NoImport, Bracket,
      InTest, LiteralStatic, LiteralNamed, LiteralInstance,
    ).oneOf()
    nondet sh = Set(
      TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
      StringCast, ReplacementsButInterpolated, FragmentReq, WholeReq,
      ConstTemplate, NumberTemplate, Literal, Replacements,
      ReplacementsArray, BindParam, Placeholders, Escaped,
      FragmentParam, AllowlistMap, RegexChecked, TernaryLiteral,
    ).filter(x => applies(st, x)).oneOf()
    all { site' = st, shape' = sh, verdict' = reports(st, sh) }
  }

  action init = step
}
