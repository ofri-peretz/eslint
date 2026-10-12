// Model of the values `sequelize-security/no-unsafe-query` must judge. Each sample is
// one program: SQL text with one interpolated value, sent to one sink.
// `shouldReport` is the rule's documented contract (2026-10 review):
//   - a VALUE position (after `=`, inside '…', in an IN (…) list) has a bind
//     parameter as its safe alternative, so any value the file cannot prove
//     fixed is reported there, wherever it came from;
//   - a FRAGMENT position (a column or ORDER BY target) has none, so it is
//     reported only when the value is traced to the inbound request.
// Fixed means: a static source, a number by construction, a member of a fixed
// allowlist or map, or the driver's own escaper.
module sequelize_security_no_unsafe_query {
  type Source = Literal | NumberConst | ReqBody | Param | EnvVar
  type Transform = NoTransform | Trim | ToNumber | Lookalike | Join | Allowlist | Lookup | Escape
  type Position = Eq | Quoted | InList | Ident | EqConcat
  type Binding = Inline | ViaConst | ViaLet | ViaHelper
  type Sink = Query | LiteralWhere

  var source: Source
  var transform: Transform
  var position: Position
  var binding: Binding
  var sink: Sink
  var expected: bool

  pure def isValue(p: Position): bool = p != Ident

  pure def safe(s: Source, t: Transform, p: Position): bool =
    match t {
      | ToNumber => true
      | Allowlist => true
      | Lookup => true
      // Another library's function: its result is not proven fixed even when
      // its argument is (first model draft called `validator.escape('admin')`
      // static; the rule cannot see what a foreign function returns).
      | Lookalike => false
      // The escaper returns a complete quoted literal. Inside '…' its quotes
      // close the author's string, so the text after them is SQL — unless
      // what was escaped is itself fixed.
      | Escape => p != Quoted or s == Literal or s == NumberConst
      | _ => s == Literal or s == NumberConst
    }

  pure def shouldReport(s: Source, t: Transform, p: Position, k: Sink): bool =
    not(safe(s, t, p)) and (isValue(p) or s == ReqBody)

  action init = all {
    nondet s = Set(Literal, NumberConst, ReqBody, Param, EnvVar).oneOf()
    nondet t = Set(NoTransform, Trim, ToNumber, Lookalike, Join, Allowlist, Lookup, Escape).oneOf()
    nondet p = Set(Eq, Quoted, InList, Ident, EqConcat).oneOf()
    nondet b = Set(Inline, ViaConst, ViaLet, ViaHelper).oneOf()
    nondet k = Set(Query, LiteralWhere).oneOf()
    all {
      source' = s, transform' = t, position' = p, binding' = b, sink' = k,
      expected' = shouldReport(s, t, p, k),
    }
  }

  action step = all {
    source' = source, transform' = transform, position' = position,
    binding' = binding, sink' = sink, expected' = expected,
  }
}
