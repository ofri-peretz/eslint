// Model of the code shapes `postgresql-security/no-unsafe-query` must judge.
// Each sample is one program: a SQL string built from one interpolated value,
// sent to one node-postgres-family sink. `shouldReport` is the rule's contract:
// a value is safe inside SQL text only if it is static, numeric by
// construction, or passed through a recognised escaper — wherever it came from.
module postgresql_security_no_unsafe_query {
  type Source = Literal | NumberConst | ReqBody | Param | EnvVar
  type Transform = NoTransform | Trim | Join | ToNumber | ParseInt | EscapeLiteral | FormatL | StringCall
  type Position = Interp | Concat | PlaceholderIndex
  type Binding = Inline | ViaConst | ViaLet | ViaHelper
  type Sink = PoolQuery | ClientQuery | PgpAny | SqlUnsafe

  var source: Source
  var transform: Transform
  var position: Position
  var binding: Binding
  var sink: Sink
  var expected: bool

  // A value that cannot carry text the author did not write.
  pure def staticSafe(s: Source, t: Transform): bool =
    match t {
      | ToNumber => true
      | ParseInt => true
      | EscapeLiteral => true
      | FormatL => true
      | _ => match s {
          | Literal => true
          | NumberConst => true
          | _ => false
        }
    }

  // `$${x}` emits a bind placeholder only when x is numeric.
  pure def placeholderSafe(s: Source, t: Transform): bool =
    match t {
      | ToNumber => true
      | ParseInt => true
      | _ => match s { | NumberConst => true | _ => false }
    }

  pure def shouldReport(s: Source, t: Transform, p: Position): bool =
    match p {
      // `$${x}` is safe when x is numeric (a real placeholder) or static/escaped
      // (then it is merely malformed SQL, not injection).
      | PlaceholderIndex => not(placeholderSafe(s, t) or staticSafe(s, t))
      | _ => not(staticSafe(s, t))
    }

  action init = all {
    nondet s = Set(Literal, NumberConst, ReqBody, Param, EnvVar).oneOf()
    nondet t = Set(NoTransform, Trim, Join, ToNumber, ParseInt, EscapeLiteral, FormatL, StringCall).oneOf()
    nondet p = Set(Interp, Concat, PlaceholderIndex).oneOf()
    nondet b = Set(Inline, ViaConst, ViaLet, ViaHelper).oneOf()
    nondet k = Set(PoolQuery, ClientQuery, PgpAny, SqlUnsafe).oneOf()
    all {
      source' = s, transform' = t, position' = p, binding' = b, sink' = k,
      expected' = shouldReport(s, t, p),
    }
  }

  action step = all {
    source' = source, transform' = transform, position' = position,
    binding' = binding, sink' = sink, expected' = expected,
  }
}
