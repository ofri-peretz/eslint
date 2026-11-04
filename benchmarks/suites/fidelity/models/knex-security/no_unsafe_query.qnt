// Model of eslint-plugin-knex-security/no-unsafe-query (CWE-89).
// A value spliced into SQL text by template interpolation or `+` (directly,
// through a variable, or `+=`) reaches the database unescaped. The sinks are
// `knex.raw()` (also on `knex.schema`, a transaction, and as `db['raw']`),
// every builder method that takes raw SQL (`whereRaw`, `orderByRaw`, ...) and
// objection's standalone `raw()`. In a VALUE position (`id = ...`) any value
// the file cannot prove fixed is reported, a handler parameter included; in a
// FRAGMENT position (an ORDER BY target) only request data is; request data
// handed over as the whole text is always reported, and bindings passed
// beside an interpolated value do not repair it. Safe: `?` / `:name`
// bindings, a `??` identifier binding, a `?` placeholder list, a constant, a
// number, an allowlist lookup or an anchored-regex check, a ternary between
// two literals, and a plain literal. Files with no knex import are not
// judged, and neither are test files.
module no_unsafe_query {
  type Site =
    | Default | Named | Require | RequireCall | NoImport | Bracket | Trx
    | Schema | InTest | WhereRaw | OrderByRaw | Objection
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | PlusAssign | IndirectConcat
    | StringCast | BoundButInterpolated | FragmentReq | WholeReq
    | ConstTemplate | NumberTemplate | Literal | Bound | NamedBound
    | Placeholders | FragmentParam | AllowlistMap | RegexChecked
    | TernaryLiteral | IdentBinding
  type Pos = V | F | W

  pure def pos(s: Shape): Pos = match s {
    | FragmentReq => F
    | FragmentParam => F
    | AllowlistMap => F
    | RegexChecked => F
    | TernaryLiteral => F
    | IdentBinding => F
    | WholeReq => W
    | _ => V
  }

  pure def unsafe(s: Shape): bool = Set(
    TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
    StringCast, BoundButInterpolated, FragmentReq, WholeReq,
  ).contains(s)

  // A whole statement takes every position; whereRaw a condition (values);
  // orderByRaw a sort target (fragments).
  pure def applies(site: Site, s: Shape): bool =
    if (site == WhereRaw or site == Objection) pos(s) != F
    else if (site == OrderByRaw) pos(s) != V
    else true

  pure def judged(site: Site): bool = site != NoImport and site != InTest

  pure def reports(site: Site, s: Shape): bool = judged(site) and unsafe(s)

  var site: Site
  var shape: Shape
  var verdict: bool

  action step = {
    nondet st = Set(
      Default, Named, Require, RequireCall, NoImport, Bracket, Trx,
      Schema, InTest, WhereRaw, OrderByRaw, Objection,
    ).oneOf()
    nondet sh = Set(
      TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
      StringCast, BoundButInterpolated, FragmentReq, WholeReq,
      ConstTemplate, NumberTemplate, Literal, Bound, NamedBound,
      Placeholders, FragmentParam, AllowlistMap, RegexChecked,
      TernaryLiteral, IdentBinding,
    ).filter(x => applies(st, x)).oneOf()
    all { site' = st, shape' = sh, verdict' = reports(st, sh) }
  }

  action init = step
}
