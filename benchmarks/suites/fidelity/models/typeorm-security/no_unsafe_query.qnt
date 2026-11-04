// Model of eslint-plugin-typeorm-security/no-unsafe-query (CWE-89).
// A value spliced into SQL text by template interpolation or `+` (directly,
// through a variable, or `+=`) reaches the database unescaped. The sinks are
// `query()` on a DataSource, its manager and a repository (also as
// `dataSource['query']`), the QueryBuilder clauses that take raw SQL
// (`where`, `andWhere`, `orderBy`, a join's condition) and the `Raw()` find
// operator, whose alias argument is TypeORM's own. In a VALUE position any
// value the file cannot prove fixed is reported, a handler parameter
// included; in a FRAGMENT position (an ORDER BY target) only request data is;
// request data handed over as the whole text is always reported, and
// parameters passed beside an interpolated value do not repair it. Safe:
// positional parameters to `query()`, `:name` parameters (inline or via
// `setParameter`), `driver.escape()` on an identifier, a constant, a number,
// an allowlist lookup or an anchored-regex check, a ternary between two
// literals, a plain literal. Files with no TypeORM import are not judged,
// and neither are test files.
module no_unsafe_query {
  type Site =
    | Named | Renamed | Require | Namespace | NoImport | Manager | Repo
    | Bracket | InTest | QbWhere | QbAndWhere | QbJoin | QbOrderBy | RawOp
  type Shape =
    | TemplateReq | TemplateParam | ConcatReq | PlusAssign | IndirectConcat
    | StringCast | ParamsButInterpolated | FragmentReq | WholeReq
    | ConstTemplate | NumberTemplate | Literal | Bound | Placeholders
    | SetParameter | Escaped | FragmentParam | AllowlistMap | RegexChecked
    | TernaryLiteral
  type Pos = V | F | W

  pure def pos(s: Shape): Pos = match s {
    | FragmentReq => F
    | FragmentParam => F
    | AllowlistMap => F
    | RegexChecked => F
    | TernaryLiteral => F
    | Escaped => F
    | WholeReq => W
    | _ => V
  }

  pure def unsafe(s: Shape): bool = Set(
    TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
    StringCast, ParamsButInterpolated, FragmentReq, WholeReq,
  ).contains(s)

  pure def isQb(site: Site): bool = Set(QbWhere, QbAndWhere, QbJoin).contains(site)

  pure def applies(site: Site, s: Shape): bool =
    // a condition: values only; positional `?` lists belong to query()
    if (isQb(site)) pos(s) != F and s != Placeholders
    else if (site == QbOrderBy) pos(s) != V
    // Raw(alias => ...) builds a condition with a template; no `+` or `+=`
    else if (site == RawOp)
      pos(s) != F and not(Set(ConcatReq, PlusAssign, IndirectConcat,
                              Placeholders, SetParameter).contains(s))
    else s != SetParameter

  pure def judged(site: Site): bool = site != NoImport and site != InTest

  pure def reports(site: Site, s: Shape): bool = judged(site) and unsafe(s)

  var site: Site
  var shape: Shape
  var verdict: bool

  action step = {
    nondet st = Set(
      Named, Renamed, Require, Namespace, NoImport, Manager, Repo,
      Bracket, InTest, QbWhere, QbAndWhere, QbJoin, QbOrderBy, RawOp,
    ).oneOf()
    nondet sh = Set(
      TemplateReq, TemplateParam, ConcatReq, PlusAssign, IndirectConcat,
      StringCast, ParamsButInterpolated, FragmentReq, WholeReq,
      ConstTemplate, NumberTemplate, Literal, Bound, Placeholders,
      SetParameter, Escaped, FragmentParam, AllowlistMap, RegexChecked,
      TernaryLiteral,
    ).filter(x => applies(st, x)).oneOf()
    all { site' = st, shape' = sh, verdict' = reports(st, sh) }
  }

  action init = step
}
